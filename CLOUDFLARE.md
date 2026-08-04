# Cloudflare performance settings for gildrb.com

The 2026-08-04 PageSpeed run showed Cloudflare modifying the origin HTML and adding four resources that the repository does not publish:

- `/cdn-cgi/scripts/.../rocket-loader.min.js`
- `/cdn-cgi/scripts/.../email-decode.min.js`
- `/cdn-cgi/speculation`
- `https://static.cloudflareinsights.com/beacon.min.js/...`

The injected email decoder was render-blocking. The analytics beacon was blocked by the site's Content Security Policy and caused both console and DevTools issue failures. Rocket Loader also added script and cache-lifetime findings.

## Required zone settings

1. Set **Speed → Optimization → Content Optimization → Rocket Loader** to **Off**.
2. Set **Security → Settings → Scrape Shield → Email Address Obfuscation** to **Off**.
3. Set **Speed → Optimization → Speed Brain** to **Off**.
4. Disable the Cloudflare Web Analytics site for `gildrb.com`, including automatic setup, so Cloudflare stops injecting the beacon.
5. Purge only the cached HTML URLs after the settings propagate; immutable fonts and images do not need purging.

The generated HTML also marks every script with `data-cfasync="false"` and wraps the public contact address in Cloudflare's `email_off` comments. Those are defense-in-depth controls, not substitutes for disabling the zone transformations.

## Safe validation

No account identifiers, API tokens, analytics tokens, DNSSEC keys, or registrar values belong in this repository. Validate only public behavior:

```sh
curl -fsSL https://gildrb.com/ | grep -E 'rocket-loader|email-decode|cloudflareinsights|cdn-cgi/speculation'
curl -fsSI https://gildrb.com/
```

The first command must return no matches. Then rerun PageSpeed Insights for mobile and desktop. The saved 2026-08-04 baseline was 84 mobile performance, 98 desktop performance, 92 best practices, and 100 for accessibility, agentic browsing, and SEO.
