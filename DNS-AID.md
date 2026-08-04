# DNS-AID deployment for gildrb.com

The website publishes a public, read-only MCP endpoint at `https://gildrb.com/mcp`. Publish these records in the authoritative Cloudflare zone after that endpoint is deployed:

```dns
_index._agents.gildrb.com. 300 IN SVCB 1 gildrb.com. alpn="h2" port=443 mandatory=alpn,port,key65001 key65001="cap=https://gildrb.com/.well-known/ai-catalog.json"
_mcp._agents.gildrb.com.   300 IN SVCB 1 gildrb.com. alpn="h2" port=443 mandatory=alpn,port,key65001,key65010 key65001="cap=https://gildrb.com/.well-known/mcp/server-card.json" key65010="bap=mcp/2025-11-25"
```

`key65001` and `key65010` are experimental numeric SvcParamKey presentation names. The mandatory list prevents clients from silently ignoring metadata they require.

## DNSSEC

1. In Cloudflare, open **DNS → Settings → DNSSEC** and select **Enable DNSSEC**.
2. Copy Cloudflare's generated DS values exactly to the domain registrar. A missing or incorrect DS-to-DNSKEY match can make the entire domain fail for validating resolvers; never invent or hand-edit these values.
3. Wait for the `.com` delegation and validating resolvers to publish the chain of trust.
4. Verify the records and authenticated-data bit:

```sh
dig +short DS gildrb.com
dig +dnssec _index._agents.gildrb.com SVCB
dig +dnssec _mcp._agents.gildrb.com SVCB
delv _mcp._agents.gildrb.com SVCB
```

Do not treat DNSSEC as complete until the parent DS record exists and `delv` reports a fully validated answer.
