# gildrb.com public API

The API exposes public, read-only portfolio information. It does not require registration or authentication.

## Profile

`GET /api/profile` returns the canonical JSON-LD profile and portfolio graph.

## Status

`GET /api/status` returns deployment health as JSON.

## MCP

`POST /mcp` implements stateless MCP Streamable HTTP for `initialize`, `ping`, `tools/list`, and `tools/call`. The server exposes two read-only portfolio tools. Discover connection metadata at `/.well-known/mcp/server-card.json`.

The OpenAPI description is available at `/openapi.json`.
