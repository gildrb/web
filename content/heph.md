# A local document agent that answers from your files and shows its work

Heph is a document agent that runs on your own machine. You point it at a folder, ask questions in plain language, and it answers with the exact passages it used sitting right next to the response. It is a full command-line and terminal application, close in spirit to a coding agent: you can talk to it interactively, call it in one shot, script it, and drive it from other tools over a JSONL protocol. I designed and engineered all of it over several months, on my own. The product, the CLI and TUI, the retrieval pipeline, the agent behavior, the provider layer, the typeface, and the tests that keep it honest are mine. It leans on established libraries for the underlying retrieval algorithms like BM25 and embeddings, and the pipeline that wraps them, along with everything else here, is my work.

I built it because I kept hitting the same wall with general assistants. When I am brainstorming, a confident guess is fine. When I am studying something and trying to fill a real gap in my understanding, a confident guess that is slightly wrong costs me more time than it saves. I wanted an agent that treats my files as the source of truth and proves where every claim came from, so I can check it in one glance instead of re-reading the whole folder.

![Heph demo](media:heph-demo)

The demo above is the real interaction model. You see the active armory, the model, the reasoning level, the answer, and the evidence that grounds it, all in one view. Nothing is hidden behind a menu.

![Heph in use](media:heph-interface)

The implementation is a Python 3.13 `uv` workspace split into five packages. `heph` owns the application composition and command surface, `harness` owns retrieval, grounding, citations, memory, documents, and guardrails, `ai` owns providers and model runtime behavior, `interfaces` owns the terminal experience, and `extensions` holds stable extension contracts. The runtime uses Textual and Rich for the terminal UI, the OpenAI SDK for OpenAI-compatible providers, `sentence-transformers`, `bm25s`, and scikit-learn for retrieval, Docling for supported document conversion, and keyring for credential storage. These are pinned dependencies, not a claim that every optional backend is active on every machine.

### The armory

The core unit in Heph is an armory. An armory is a normal folder for one topic that carries its own materials, retrieval index, memory, chats, and diagnostics. If you want to study biology, you make a `Biology` armory, drop your files into its `materials` directory, and open it with `heph Biology`.

On disk it stays completely inspectable:

```text title="docs/index.md: Armory layout"
~/.armories/[name]/
├── materials/            # PDFs, Office docs, notes, code to cite
│   ├── [file].pdf
│   └── [file].md
├── .harness/             # Local Heph state
│   ├── armory.toml       # Armory marker
│   ├── rag_index.json    # Retrieval index
│   ├── memory.json       # Armory memory
│   ├── chats/            # Saved sessions
│   ├── traces/           # JSONL traces when enabled
│   ├── usage/            # Token and cost snapshots
│   └── ignore            # Indexing ignore rules
└── README.md             # Armory notes
```

I kept every armory isolated on purpose. Before I ask anything, I already know exactly which files Heph can and cannot see. There is no shared vector service in the cloud and no ambiguity about scope. Your files stay yours, on your disk, in formats you can open yourself.

### How retrieval works

Most of my time on Heph went here. I did not write BM25 or train an embedding model, since good libraries already exist for both. What I wrote is everything around them: how a question gets rewritten, how the results get combined, what happens when a piece is not available, and how the context gets trimmed before the model sees it.

Adding a file imports it into the armory and breaks it into chunks. Text and Markdown split along their own headings so sections stay whole. Supported Office formats and Docling-supported binary formats can run through Docling inside a worker with hard limits on time, memory, and output size. PDFs also have `pdftotext` and OCR fallbacks using `pdftoppm` and `tesseract`, because a broken or difficult file should fail quietly on its own rather than take the whole process down. Each chunk remembers where it came from, down to the file, the character range, and the heading above it. That is what lets an answer point back to an exact place in a real document later on.

Indexing is incremental. Heph hashes each file, keeps the ones that have not changed, and re-chunks only what moved. The index is plain JSON you can open and read, and while it builds it refuses to follow symlinks or paths that try to climb out of the armory.

Retrieval can be hybrid when the configured mode and available backends support it. A question runs through a few steps before it reaches the model:

```text title="Retrieval pipeline"
query
  → normalize + expand
  → sparse retrieval
  → dense retrieval
  → rank fusion
  → feedback (optional)
  → rerank (optional)
  → source + quote + negation checks
  → top-k chunks
```

Sparse retrieval prefers `bm25s`. If it is not installed, Heph uses a BM25 implementation against the standard library, and if that path is not workable it can drop to TF-IDF. Dense retrieval embeds each chunk with `all-MiniLM-L6-v2` and compares by cosine similarity when the embedding backend is available. A `cross-encoder/ms-marco-MiniLM-L-6-v2` reranks the shortlist when that optional backend is available. I fuse the available rankings with weighted reciprocal-rank fusion, then adjust the result with the things I found actually mattered on real questions: optional pseudo-relevance feedback, a boost for quoted phrases, a hint from the source path, and a penalty for negated terms.

The query transformer can retain the original question while adding a small synonym or WordNet expansion. Pseudo-relevance feedback extracts terms from the top sparse results, and the post-processing stage applies explicit quoted or section hints, source-path overlap, and a negation precision penalty. Heading-aware Markdown chunks preserve context, while semantic chunking is another optional path that falls back to ordinary text chunking when embeddings are unavailable. The point is not that every installation gets the same pipeline. The point is that each layer has a defined fallback instead of making one model download or one document converter a hard requirement.

All of that fallback logic is there because Heph runs on other people's machines, not on a server I control. Someone might not have the embedding model downloaded, or might be on a laptop without a GPU. I would rather the answers get a little weaker than watch the program fall over, so retrieval works with whatever is on the machine and still comes back with something useful.

### Evidence you can audit

The part I care about most is how evidence is handled. It is a real typed object in the code with its own ID and a defined life inside a single turn.

After retrieval, Heph builds the evidence set for a turn. It promotes distinct sources first so a single file cannot dominate the context, applies a token budget, and assigns stable IDs in prompt order (`E1`, `E2`, `E3`, `E4`). The model is told to cite those IDs, and afterwards a verification pass checks every citation in the reply against the exact evidence objects used for that turn. It can tell the difference between a verified citation, an unknown ID the model invented, an answer that carried evidence but forgot to cite it, and an answer that had no evidence at all. A long, confident answer with no citations gets flagged.

When you open a citation, Heph maps the chunk offsets back to line spans in the original file and shows a highlighted excerpt from the real source. It refuses absolute paths and anything that tries to escape the armory while doing this. That whole chain, from retrieved chunk to typed evidence to verified citation to a highlighted line range in your file, is the feature I started the project for.

### Architecture I can defend

Heph is a `uv` workspace split into five packages, and the boundaries between them are enforced by import-linter contracts rather than good intentions:

```toml title="pyproject.toml: [tool.importlinter]"
[tool.importlinter]
root_packages = ["ai", "extensions", "heph", "harness", "interfaces"]
exclude_type_checking_imports = true
include_external_packages = true

[[tool.importlinter.contracts]]
name = "AI must stay below Heph, the harness, extensions, and interfaces"
type = "forbidden"
source_modules = ["ai"]
forbidden_modules = [
    "extensions",
    "heph",
    "harness",
    "interfaces",
]
```

The contracts make the dependency direction executable. The `ai` runtime cannot reach up into the app. Retrieval and material code cannot import chat or UI internals. The interface layer cannot import application composition. This is what keeps a codebase of roughly 300 Python source files understandable as a single person's project. When I come back to it after a break, the architecture tells me where things belong instead of making me guess.

The boundaries are more specific than that summary suggests. `harness.rag` cannot import the agent, chat, or document adapter layers. Materials cannot import retrieval, chat, or agent code. Documents remain a pure controller layer, memory cannot import chat or agent code, and the agent cannot import chat. The chat session and orchestrator are independent at runtime. Import-linter checks these directions in CI rather than leaving them as conventions.

### Runs with any model, including local ones

The `ai` package is a provider-neutral runtime for OpenAI-compatible APIs. Out of the box it configures Pollinations as a keyless default, alongside OpenRouter, OpenAI, DeepSeek, Z.AI, a managed local `llama.cpp` server, and a custom endpoint slot. They are configured provider records, not simultaneously active services. Credentials resolve lazily through provider references and keyring-backed storage, so keys never get baked into a generic chat config.

The runtime handles the things that only show up in practice: streaming deltas, tool-call normalization, usage accounting, prompt-cache shaping, retries with exponential backoff, and a circuit breaker. My favorite detail is stream recovery. If a provider drops the connection before any output has arrived, the runtime quietly retries. If it drops mid-stream after tokens are already on screen, it raises a `StreamRecoveryError` that carries the partial response, so the caller can recover cleanly instead of throwing away what the user was already reading.

Local models get the same treatment as every remote one. `heph local` discovers, installs, and validates GGUF models, then manages the `llama.cpp` server lifecycle and probes each model for tool-call support, all behind the same runtime abstraction the remote providers use. A local model is not assumed to support tools just because it is installed.

### The interface I had to fight for

The whole thing lives in a terminal, built on Textual. I use Textual as a foundation instead of forking it, but getting the interface I wanted meant reaching under the hood far more than a typical app does. I run a small runtime patch so Textual can decode the modified key sequences that tmux and xterm send, which is what makes shortcuts behave correctly across different terminals. I reimplemented the input widget so the composer handles multiline editing and shell-style word deletion. I added cross-widget text selection so you can select and copy across the transcript, the option lists, and the inputs, which the framework does not give you out of the box. I also wrote transparent rendering subclasses to stop the compositor from painting black behind panels that are supposed to stay see-through. When it all works none of it is visible, and that is exactly the goal.

The look of the terminal is deliberate too. Colors run through a small semantic palette with named roles and explicit dark and light presets, so status labels, evidence citations, and source footers all stay consistent. The palette gives the interface a stable visual vocabulary instead of scattering concrete color values through individual widgets.

### Treating the agent like real software

A document agent reads untrusted files and remembers things across sessions, so I built it to be suspicious.

Memory is filtered on the way in and on the way out. Entries have size and confidence limits, and they are checked for invisible Unicode, prompt-injection patterns, and secret-exfiltration patterns before they are ever trusted. Document extraction is bounded so a hostile PDF cannot exhaust memory or hang the process. Source mapping and session handling reject absolute paths, path traversal, symlink escapes, and unsafe identifiers.

There is also an attempts subsystem that observes each answer and applies a static policy: accept when the answer, evidence, and citations meet the requirements; abstain when the request is unsafe, off-topic, or too thinly grounded; or retry with a stricter grounded answer. It can also retry for distinct sources when one file dominates, or for a shorter answer when the response is too long. That is what turns a chat loop into something I can reason about and control.

### How I keep myself honest

Because I am the only person on this, the tooling has to do the work a team would. Heph runs on Python 3.13 with `ruff`, the `ty` type checker, `import-linter` for the architecture contracts, Bandit, Vulture, dependency checks, documentation-sync validation, Pylint duplicate-code checks, and Radon complexity checks. The repository has roughly 2,300 test functions across the packages, a configured coverage floor, and CI runs the lint, type, architecture, security, release, and pytest jobs. There is a full documentation site and a runbook for CI failures. None of that is glamorous, and it is exactly why I trust the thing enough to use it every day.

### What works today

The command surface is intentionally concrete. I can open an armory by name with `heph <armory>` or launch the explicit TUI with `heph tui [path]`. There are commands for `heph armory init` and `heph armory open`, `heph materials list`, `count`, and `index`, plus `heph index` and `heph health`. Local model management is exposed through `heph local search`, `install`, `status`, `revalidate`, and `stop`. The SDK exposes `heph sdk serve` and `heph sdk capabilities`, while `heph config ...`, `heph trust`, and `heph update` cover configuration, trust information, and updates. There is also a hidden `heph chat ask` path for one-shot or JSONL automation.

Inside the TUI, routes such as `/evidence`, `/models`, `/armory`, `/memory`, `/sessions`, `/local`, `/settings`, `/turn`, `/new`, `/detach`, `/tokens`, `/cost`, `/thinking`, `/materials`, and `/keymap` keep those workflows close to the conversation. These are TUI routes, not standalone CLI subcommands. The distinction matters because the same product has both an interactive terminal surface and scriptable command and SDK surfaces.

### The identity work

Once the agent was solid, I started drawing a custom typeface for a graphical interface I was considering, with the terminal keeping its monospaced face. I wanted the type, the logo, and the wordmark to come from the same hand so the whole product would feel deliberate.

![Drawing the first letterforms](media:heph-typeface-early)

I worked through the character set slowly, checking individual curves and how the letters sat together. A few shapes took far longer to settle than I expected.

![Refining the typeface](media:heph-typeface-refinement)

That work fed a new Heph lockup and gave the product a clearer visual identity as I keep polishing it.

![The Heph lockup](media:heph-lockup)

### Where it is going

Heph is young and I have a long list of things I want to sharpen: better retrieval on messy corpora, faster indexing, and an even smoother way to inspect evidence without breaking the flow of a conversation. The design is built to age well. The model behind it can improve or be swapped as open-source models get cheaper and stronger, and the core promise holds either way. Your files stay yours, and you can always check what an answer is built on.

I am building the tool I always wanted to exist and holding it to the standard I would expect from a full team, even though it is only me. There is a lot more coming.

[GitHub repository](https://github.com/gildrb/heph)
