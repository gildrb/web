# A local document agent that answers from your files and shows its work

Heph is a document agent that runs on your own machine. You point it at a folder, ask questions in plain language, and it answers with the exact passages it used sitting right next to the response. It is a full command-line and terminal application, close in spirit to a coding agent: you can talk to it interactively, call it in one shot, script it, and drive it from other tools over a JSONL protocol. I designed and engineered all of it over several months, on my own. The product, the CLI and TUI, the retrieval pipeline, the agent behavior, the provider layer, the typeface, and the tests that keep it honest are mine. It leans on established libraries for the underlying retrieval algorithms like BM25 and embeddings, and the pipeline that wraps them, along with everything else here, is my work.

I built it because I kept hitting the same wall with general assistants. When I am brainstorming, a confident guess is fine. When I am studying something and trying to fill a real gap in my understanding, a confident guess that is slightly wrong costs me more time than it saves. I wanted an agent that treats my files as the source of truth and proves where every claim came from, so I can check it in one glance instead of re-reading the whole folder.

![Heph demo](media:heph-demo)

The demo above is the real interaction model. You see the active armory, the model, the reasoning level, the answer, and the evidence that grounds it, all in one view. Nothing is hidden behind a menu.

![Heph in use](media:heph-interface)

## The armory

The core unit in Heph is an armory. An armory is a normal folder for one topic that carries its own materials, retrieval index, memory, chats, and diagnostics. If you want to study biology, you make a `Biology` armory, drop your files into its `materials` directory, and open it with `heph Biology`.

On disk it stays completely inspectable:

```text title="~/.armories/Biology/"
materials/            your original files, untouched
.harness/
  armory.toml         armory marker and config
  rag_index.json      chunked, hashed retrieval index
  memory.json         persistent extracted context
  chats/              saved sessions
  traces/             per-turn diagnostics
  usage/              token and cost accounting
```

I kept every armory isolated on purpose. Before I ask anything, I already know exactly which files Heph can and cannot see. There is no shared vector service in the cloud and no ambiguity about scope. Your files stay yours, on your disk, in formats you can open yourself.

## How retrieval actually works

This is where most of the engineering lives, and where the difference between a weekend script and a real tool shows up. I did not reinvent BM25 or train embeddings. I used solid libraries for those and built the pipeline around them: the fusion, the fallbacks, the query rewriting, and the post-processing that decides what the model actually sees.

When you add a file, Heph imports it into the armory, then extracts and chunks it. Plain text and Markdown are chunked with structure awareness so headings and sections stay intact. Binary formats like PDF, DOCX, PPTX, and XLSX go through a Docling conversion step that runs inside a bounded worker with output limits, timeouts, memory ceilings, and OCR deadlines, so a single pathological file cannot hang or exhaust the process. Every chunk keeps its source path, character offsets, and nearest heading, which is what later lets an answer point back to a precise span of a real document.

Indexing is incremental. Heph hashes document content, reuses unchanged files across rebuilds, and only re-chunks what actually changed. The index is a readable JSON file, and it defends against symlink and path-escape tricks while it builds.

Retrieval itself is hybrid. A question flows through a real pipeline before it reaches the model:

```text title="Retrieval pipeline"
query
  → normalization and expansion (multi-query and HyDE-style rewrites)
  → sparse retrieval (BM25)
  → dense retrieval (sentence-transformer embeddings)
  → reciprocal-rank fusion
  → optional pseudo-relevance feedback
  → optional cross-encoder reranking
  → source, quote, and negation post-processing
  → top-k chunks
```

Sparse retrieval uses `bm25s` when it is installed, falls back to a standard-library BM25 implementation when it is not, and falls back again to TF-IDF as a last resort. Dense retrieval embeds each chunk with `all-MiniLM-L6-v2` and ranks by cosine similarity, with a `ms-marco` cross-encoder available to rerank the shortlist. The two rankings are fused with reciprocal-rank fusion, and the pipeline I wrote layers pseudo-relevance feedback, quoted-phrase boosts, source-path hints, and a negation penalty on top to keep precision high.

The reason for all those fallbacks is that Heph runs on other people's machines instead of a controlled server. Someone may not have the embedding model downloaded, or may be on a laptop with no GPU. I wanted the answer quality to degrade gracefully instead of the program crashing, so the retrieval layer negotiates whatever is available and still returns something useful.

## Evidence you can actually audit

The part I care about most is that evidence is a first-class, typed object with its own identity and lifecycle inside a turn.

After retrieval, Heph builds the evidence set for a turn. It promotes distinct sources first so a single file cannot dominate the context, applies a token budget, and assigns stable IDs in prompt order (`E1`, `E2`, `E3`, `E4`). The model is told to cite those IDs, and afterwards a verification pass checks every citation in the reply against the exact evidence objects used for that turn. It can tell the difference between a verified citation, an unknown ID the model invented, an answer that carried evidence but forgot to cite it, and an answer that had no evidence at all. A long, confident answer with no citations gets flagged.

When you open a citation, Heph maps the chunk offsets back to line spans in the original file and shows a highlighted excerpt from the real source. It refuses absolute paths and anything that tries to escape the armory while doing this. That whole chain, from retrieved chunk to typed evidence to verified citation to a highlighted line range in your file, is the feature I started the project for.

## Architecture I can defend

Heph is a `uv` workspace split into five packages, and the boundaries between them are enforced by import-linter contracts rather than good intentions:

```text title="Packages"
extensions   stable contracts, no runtime dependencies
ai           provider and model runtime, OpenAI-compatible
harness      armories, materials, RAG, evidence, memory, safety
interfaces   terminal and Textual UI adapters
heph         CLI, TUI composition, slash commands, SDK
```

The contracts make the dependency direction executable. The `ai` runtime cannot reach up into the app. Retrieval and material code cannot import chat or UI internals. The interface layer cannot import application composition. This is what keeps a codebase of roughly 300 Python source files understandable as a single person's project. When I come back to it after a break, the architecture tells me where things belong instead of making me guess.

## Runs with any model, including local ones

The `ai` package is a provider-neutral runtime for OpenAI-compatible APIs. Out of the box it configures Pollinations, OpenRouter, OpenAI, DeepSeek, Z.AI, a managed local `llama.cpp` server, and a custom endpoint slot. Credentials resolve lazily and are stored as provider references, so keys never get baked into a generic chat config.

The runtime handles the things that only show up in practice: streaming deltas, tool-call normalization, usage accounting, prompt-cache shaping, retries with exponential backoff, and a circuit breaker. My favorite detail is stream recovery. If a provider drops the connection before any output has arrived, the runtime quietly retries. If it drops mid-stream after tokens are already on screen, it raises a `StreamRecoveryError` that carries the partial response, so the caller can recover gracefully instead of throwing away what the user was already reading.

Local models are a first-class provider. `heph local` discovers, installs, and validates GGUF models, then manages the `llama.cpp` server lifecycle and probes it for tool-call support, all behind the same runtime abstraction the remote providers use.

## The interface I had to fight for

The whole thing lives in a terminal, built on Textual. I use Textual as a foundation instead of forking it, but getting the interface I wanted meant reaching under the hood far more than a typical app does. I run a small runtime patch so Textual can decode the modified key sequences that tmux and xterm send, which is what makes shortcuts behave correctly across different terminals. I reimplemented the input widget so the composer handles multiline editing and shell-style word deletion. I added cross-widget text selection so you can select and copy across the transcript, the option lists, and the inputs, which the framework does not give you out of the box. I also wrote transparent rendering subclasses to stop the compositor from painting black behind panels that are supposed to stay see-through. When it all works none of it is visible, and that is exactly the goal.

The look of the terminal is deliberate too. Colors run through a small semantic palette with named roles, a default theme with a set of presets, and real light and dark behavior, so status labels, evidence citations, and source footers all stay consistent. I keep that theming written down as its own design doc, the same way I document the rest of the product, so the terminal and everything around it stay in step.

## Treating the agent like real software

A document agent reads untrusted files and remembers things across sessions, so I built it to be suspicious.

Memory is filtered on the way in and on the way out. Entries have size and confidence limits, and they are checked for invisible Unicode, prompt-injection patterns, and secret-exfiltration patterns before they are ever trusted. Document extraction is bounded so a hostile PDF cannot exhaust memory or hang the process. Source mapping and session handling reject absolute paths, path traversal, symlink escapes, and unsafe identifiers.

There is also an attempts subsystem that observes each answer and applies a static policy: is there enough evidence, are citations required here, is the model making an unsupported claim, should it abstain or retry. That is what turns a chat loop into something I can reason about and control.

## How I keep myself honest

Because I am the only person on this, the tooling has to do the work a team would. Heph runs on Python 3.13 with `ruff`, the `ty` type checker, `import-linter` for the architecture contracts, `bandit` and `vulture` and `gitleaks`, duplicate-code and complexity checks, dependency and docs-sync validation, and a large `pytest` suite (roughly 2,400 test functions across the packages). CI runs all of it on every change. There is a full documentation site and a runbook for CI failures. None of that is glamorous, and it is exactly why I trust the thing enough to use it every day.

## The identity work

Once the agent was solid, I started drawing a custom typeface for a graphical interface I was considering, with the terminal keeping its monospaced face. I wanted the type, the logo, and the wordmark to come from the same hand so the whole product would feel deliberate.

![Drawing the first letterforms](media:heph-typeface-early)

I worked through the character set slowly, checking individual curves and how the letters sat together. A few shapes took far longer to settle than I expected.

![Refining the typeface](media:heph-typeface-refinement)

That work fed a new Heph lockup and gave the product a clearer visual identity as I keep polishing it.

![The Heph lockup](media:heph-lockup)

## Where it is going

Heph is young and I have a long list of things I want to sharpen: better retrieval on messy corpora, faster indexing, and an even smoother way to inspect evidence without breaking the flow of a conversation. The design is built to age well. The model behind it can improve or be swapped as open-source models get cheaper and stronger, and the core promise holds either way. Your files stay yours, and you can always check what an answer is built on.

I am building the tool I want to exist, holding it to the standard I would expect from a team, and shipping it as one person. There is a lot more coming.

[GitHub repository](https://github.com/gildrb/heph)
