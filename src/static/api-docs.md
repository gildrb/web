# gildrb.com public API

The API exposes public, read-only portfolio information. It does not require registration or authentication.

## Versioning

Versioned endpoints live under `/api/v1/`. The unversioned paths (`/api/profile`, `/api/status`) are deprecated legacy aliases of v1: their responses carry `Deprecation` and `Sunset` headers (currently `Sun, 01 Aug 2027 00:00:00 GMT`). Breaking changes ship only under a new path version (`/api/v2/`). When a path version is deprecated it keeps answering with `Deprecation` and `Sunset` headers for at least 180 days before removal. Every API response carries `X-API-Version: v1`. `GET /api/v1` returns a machine-readable index of all endpoints.

## Profile

`GET /api/v1/profile` (alias `GET /api/profile`) returns the canonical JSON-LD profile and portfolio graph.

## Status

`GET /api/v1/status` (alias `GET /api/status`) returns deployment health as JSON with `status`, `service`, `version`, and `timestamp`.

## MCP

`POST /mcp` implements stateless MCP Streamable HTTP for `initialize`, `ping`, `tools/list`, and `tools/call`. The server exposes two read-only portfolio tools. Discover connection metadata at `/.well-known/mcp` (SEP-1960 manifest) or `/.well-known/mcp/server-card.json` (server card).

## Rate limits

The API allows 60 requests per 60 seconds. Every response advertises this with the RFC 9451 headers `RateLimit-Limit: 60` and `RateLimit-Policy: 60;w=60`. A `429` response additionally carries `Retry-After` in seconds. Agents should read these headers and self-throttle.

## Errors

All 4xx and 5xx responses use RFC 9457 `application/problem+json` with a stable machine-readable `title`, an HTTP `status`, and a human-readable `detail` that includes a resolution hint:

```json
{
  "type": "https://gildrb.com/api-docs.md#errors",
  "title": "Not Found",
  "status": 404,
  "detail": "Unknown API resource. See https://gildrb.com/api-docs.md for available endpoints.",
  "instance": "/api/v1/nope"
}
```

JSON-RPC protocol errors on `/mcp` use the standard JSON-RPC 2.0 `error` object with codes such as `-32700` (parse error), `-32600` (invalid request), and `-32601` (method not found).

## Documentation

The OpenAPI 3.1 description is available at `/openapi.json`. Human-readable developer resources are at `/developers`. Authentication details are in `/auth.md`.
