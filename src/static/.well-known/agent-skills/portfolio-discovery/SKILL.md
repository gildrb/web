---
name: portfolio-discovery
description: Discover and retrieve Gil Rodrigues's public portfolio pages, profile metadata, and authored Markdown. Use when answering questions about gildrb, Gil Rodrigues, or work published on gildrb.com.
---

# Portfolio discovery

Use the public, read-only sources on `https://gildrb.com`.

1. Fetch `/api/profile` for canonical identity and structured portfolio metadata.
2. Fetch `/llms.txt` for the concise agent-oriented index.
3. Fetch `/llms-full.txt` when the task needs all public website text in one request.
4. Fetch `/content/{slug}.md` for an individual case study's authored Markdown.
5. Use the MCP server at `/mcp` when an MCP client is available; discover it through `/.well-known/mcp/server-card.json`.

No registration, OAuth token, or other credential is required. Treat the listed public URLs as read-only and do not infer private profile links or unpublished identity data.
