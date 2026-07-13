# Local answers are only useful when their evidence stays visible.

> Heph CLI is a local document agent that indexes files into armories, retrieves relevant passages, and keeps the evidence behind each answer inspectable.

- **Contribution:** Product design and engineering
- **Scope:** CLI, retrieval workflow, and evidence interface
- **Context:** Open-source local document tooling

```text title="Install Heph and open a bounded document workspace"
uv tool install heph@latest
heph armory init research
cp document.pdf ~/.armories/research/materials/
heph research
```

## Keep each body of knowledge bounded

Heph organizes work into armories. Each armory owns its materials, index, settings, and memory, so a question begins with an explicit body of source material rather than an unrestricted folder or an opaque remote collection.

Files remain user-owned. Adding material is an ordinary filesystem operation, and indexing is an explicit command. That boundary makes it easier to understand what the agent can retrieve before asking it to explain anything.

## Make retrieval inspectable

An answer can sound convincing while resting on the wrong passage. Heph therefore keeps citation identifiers attached to answers and exposes the retrieved passages through `/evidence`.

The interface treats retrieval as part of the result, not hidden implementation detail. When an answer is weak, the next step is concrete: inspect the evidence, check material health, refresh the index, or change the model.

## Read and run the source

Heph is developed in public. The [GitHub repository](https://github.com/gildrb/heph) contains the implementation, installation path, command reference, and current project history.

The homepage demo condenses this workflow into one surface. The repository and the working CLI remain the source of truth for what Heph supports.
