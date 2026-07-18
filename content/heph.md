# A local document agent that answers from your files and shows its work

Heph is a document agent that runs on your machine. Point it at a folder and ask a question. It places the passages used for the answer beside the response. The application has an interactive terminal and a one-shot command; other tools can use its JSONL service.

I built Heph because general assistants were unreliable when I used them to study. A plausible mistake could take longer to find than the original answer saved. I wanted a tool that treated my files as the source and exposed enough evidence for me to check each answer quickly.

![Heph demo](media:heph-demo)

The demo shows the actual interaction model. The active armory, selected model, reasoning level, answer, and retrieved evidence remain visible during the conversation. Other commands are available through the command palette and slash routes.

![Heph in use](media:heph-interface)

Heph requires Python 3.13 and is managed as a five-package `uv` workspace. Textual and Rich provide the terminal foundation. Retrieval uses `bm25s`, `sentence-transformers`, and scikit-learn when those backends are available. Docling handles supported document conversion, while credentials can be stored through the operating system keyring.

### Armories

An armory is a normal folder for one subject. It contains the source material for that subject and its own index, memory, chat history, and diagnostics. A biology armory, for example, can be opened with `heph Biology` after its files are placed in the `materials` directory.

The layout stays inspectable on disk:

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

Each armory has a separate local index. When a hosted model is selected, Heph sends that provider the active question, its instructions, and the retrieved passages needed for the answer. A local `llama.cpp` model keeps those prompts and passages on the machine.

### Retrieval

I did not implement BM25 or train an embedding model. My work is the pipeline around those components: document conversion, chunking, indexing, query changes, ranking, fallback behavior, and the source mapping used by citations.

Markdown is split by heading so its section structure survives indexing. Other text uses semantic chunking when the embedding backend is present and fixed-window chunking otherwise. Supported Office documents run through Docling in a worker with limits on time, memory, source size, and output size. PDF extraction can fall back to `pdftotext`, then to OCR with `pdftoppm` and `tesseract`. A failed document is isolated instead of stopping the full index.

Each chunk records its source path and character offsets. Markdown chunks also retain the nearest heading. Indexing hashes the source files and only processes files that changed. The index is stored as JSON. Indexing also rejects path traversal and refuses to follow symlinks out of the armory.

A query passes through the available retrieval stages before any context reaches the model:

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

Sparse retrieval prefers `bm25s`. If that backend is unavailable, Heph can use its own BM25 path and then TF-IDF as a further fallback. Dense retrieval uses `all-MiniLM-L6-v2` with cosine similarity. The optional reranker is `cross-encoder/ms-marco-MiniLM-L-6-v2`. When sparse and dense results both exist, weighted reciprocal-rank fusion combines them.

Post-processing can expand a query with a small synonym set, apply pseudo-relevance feedback, favor quoted phrases, use source-path hints, and penalize results that conflict with negated terms. Every optional stage has a fallback because installations differ in available models and hardware.

### Evidence

Evidence is a typed object with an ID that lasts for one turn. After retrieval, Heph favors distinct sources and applies the context budget. It then assigns IDs in prompt order such as `E1` and `E2`. The model cites those IDs. A verification pass checks the reply against the exact evidence objects supplied for that turn.

The verifier distinguishes valid citations from invented IDs. It also detects a grounded answer that omitted its citations and an answer produced without evidence. Opening a citation maps the stored character offsets back to line spans in the original file and shows the matching excerpt. Absolute paths and paths outside the armory are rejected during that lookup.

### Package boundaries

The workspace contains `ai`, `extensions`, `heph`, `harness`, and `interfaces`. Import-linter contracts enforce the dependency direction:

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

The `ai` runtime cannot import the application, retrieval harness, extension layer, or interface. Retrieval cannot import chat, agent, or document adapter code. Material handling cannot import retrieval. The interface cannot import application composition, and command modules cannot reach into TUI internals. CI runs the contracts.

### Hosted APIs and local models

Heph supports Pollinations, OpenRouter, OpenAI, DeepSeek, Z.AI, local `llama.cpp`, and custom OpenAI-compatible endpoints. These are available provider configurations, not services that run together. Hosted credentials are resolved when needed from provider references, environment variables, or keyring storage.

The runtime normalizes streaming output and tool calls, records usage, shapes prompt-cache fields, retries eligible failures with exponential backoff, and opens a circuit breaker after repeated provider errors. If a stream fails before any output appears, it can be retried. If the connection fails after text is already visible, `StreamRecoveryError` carries that partial response so the interface can preserve it.

`heph local` searches curated GGUF releases, installs a chosen model, manages a loopback-only `llama.cpp` server, and runs a tool-call probe. A downloaded model appears in the model picker only after it returns a valid tool call with valid JSON arguments. Failed models remain available for later revalidation.

### Terminal details

The interface is built on Textual, with a small runtime patch for modified key sequences sent by tmux and xterm. I replaced the standard input behavior to support multiline editing and shell-style word deletion.

I also added text selection across transcript and input widgets. Transparent rendering subclasses prevent the compositor from painting opaque backgrounds behind panels that should remain clear. A semantic color palette supplies the terminal's dark and light themes.

### Safety boundaries

Armory files are untrusted input. Memory entries have size and confidence limits, and filters check them for invisible Unicode, prompt-injection patterns, and secret-exfiltration patterns. Document workers are bounded so a hostile file cannot consume unlimited memory or keep the process alive indefinitely. Source mapping and session identifiers reject unsafe paths.

A separate attempts policy reviews each answer. It can accept the result, abstain when evidence or safety requirements are not met, or retry under a stricter grounding rule. It can also request another source when one document dominates the evidence.

### Repository checks

The repository uses Ruff, the `ty` type checker, import-linter, Bandit, Vulture, dependency checks, Pylint duplicate-code checks, and Radon complexity checks. Pytest runs with a configured coverage floor. CI also verifies generated documentation and release state, and the repository includes a runbook for failed checks.

### Command surfaces

Running `heph <armory>` opens the terminal application. The CLI can create an armory, list or index materials, inspect index health, and manage local models. `heph chat ask` handles one-shot questions, including JSONL output, while `heph sdk serve` exposes the stdio service.

Inside the TUI, slash routes open evidence, models, armories, memory, sessions, settings, materials, and the editable keymap. These routes belong to the terminal interface; they are not separate shell commands. The repository's CLI reference lists the complete current command set.

### Identity work

After the agent was working, I began drawing a custom typeface for a graphical interface I was considering. The terminal would keep its monospaced face, while the typeface, logo, and wordmark would share the same drawing decisions.

![Drawing the first letterforms](media:heph-typeface-early)

I worked through the character set slowly, checking individual curves and the spacing between letters.

![Refining the typeface](media:heph-typeface-refinement)

Those drawings produced the current Heph lockup.

![The Heph lockup](media:heph-lockup)

### Next work

Heph is still in beta. My next task is better retrieval on messy collections. I also want faster indexing and a shorter path from a citation to its source passage. The provider layer can change without altering the armory format or evidence IDs.

I use Heph for my own document work and continue to develop it in public.

[GitHub repository](https://github.com/gildrb/heph)
