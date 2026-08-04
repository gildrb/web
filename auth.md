# auth.md for gildrb.com

## Agent audience

AI agents may read the public portfolio, profile API, Markdown representations, and read-only MCP tools.

## Registration

No registration or provisioning step is required. gildrb.com does not issue agent accounts or credentials.

## Authentication method

The published APIs and MCP tools are public and read-only. Send requests without an `Authorization` header. OAuth protected-resource and authorization-server metadata are intentionally not published because there is no protected resource or authorization server.

## Endpoints

- Profile API: `GET https://gildrb.com/api/profile`
- API catalog: `GET https://gildrb.com/.well-known/api-catalog`
- MCP transport: `POST https://gildrb.com/mcp`
- MCP Server Card: `GET https://gildrb.com/.well-known/mcp/server-card.json`

## Credential use and revocation

No credentials are accepted, so there are no claims, tokens, or revocation endpoints.
