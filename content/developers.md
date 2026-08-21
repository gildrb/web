# gildrb.com developer resources

Canonical page: https://gildrb.com/developers

Everything on gildrb.com is built to be readable by agents as well as humans. There is no API key, sandbox, or registration: all surfaces are public and read-only, and no `Authorization` header is required (see [auth.md](https://gildrb.com/auth.md)).

## REST API (v1)

- `GET https://gildrb.com/api/v1/profile` - canonical JSON-LD identity and portfolio graph (alias: `/api/profile`)
- `GET https://gildrb.com/api/v1/status` - liveness probe returning `status`, `service`, `version`, `timestamp` (alias: `/api/status`)
- Errors use RFC 9457 `application/problem+json` with a stable `title` and a `detail` resolution hint.
- Rate limits are 60 requests per 60 seconds and are advertised on every response via `RateLimit-Limit` and `RateLimit-Policy`; a 429 also carries `Retry-After`.

## OpenAPI

The machine-readable OpenAPI 3.1 description, including the typed error model, is at [openapi.json](https://gildrb.com/openapi.json). Human-readable docs: [api-docs.md](https://gildrb.com/api-docs.md). API catalog (linkset): [/.well-known/api-catalog](https://gildrb.com/.well-known/api-catalog).

## MCP server

A stateless MCP Streamable HTTP server is available at `POST https://gildrb.com/mcp` with two read-only tools: `list_portfolio_pages` and `get_portfolio_page`. Connection metadata: [/.well-known/mcp/server-card.json](https://gildrb.com/.well-known/mcp/server-card.json).

## Agent discovery

- [llms.txt](https://gildrb.com/llms.txt) - canonical LLM reference with when-to-use guidance
- [llms-full.txt](https://gildrb.com/llms-full.txt) - the complete public site text in one request
- [sitemap.xml](https://gildrb.com/sitemap.xml) and [robots.txt](https://gildrb.com/robots.txt) - crawl policy (all search and AI crawlers allowed)
- Every HTML page negotiates Markdown via `Accept: text/markdown`
- [/.well-known/ai-catalog.json](https://gildrb.com/.well-known/ai-catalog.json) and [/.well-known/agent-skills/index.json](https://gildrb.com/.well-known/agent-skills/index.json) - structured agent discovery

## Site source

The entire site, including these endpoints' source, is open at [github.com/gildrb/web](https://github.com/gildrb/web). There is no CLI tool; script interactions should use the REST API or MCP server above.
