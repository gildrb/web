# The site you are on is the case study

This repository is both the portfolio and its proof. Authored Markdown, shared HTML partials, route CSS and JavaScript, media, generated pages, machine-readable mirrors, and verification scripts live together so a source change can be rebuilt and checked from one checkout.
You can read the [source code](https://github.com/gildrb/web).

### Built from source

The package exposes one build command: `npm run build`. It runs `node scripts/build-page.mjs`, verifies the public agent-discovery contracts, and prepares the Cloudflare Pages output.

`scripts/site-config.mjs` is the route registry. It defines the homepage bundle, eight case studies - Filen, Heph, Ben Davis, T3, mL7, n0thing, CURVES, and gildrb.com - and the `/all` bundle. `scripts/build-page.mjs` resolves HTML includes, renders the Markdown, bundles route-specific CSS and JavaScript, inlines the profile JSON-LD, and writes the homepage, `/all`, all eight case pages, `profile.json`, and `llms-full.txt`.

`scripts/prepare-cloudflare-output.mjs` copies the publishable tree to `public/`, enforces the homepage byte budget, and rejects render gates, unused font preloads, or superseded entry behavior. Cloudflare Pages Functions provide Markdown negotiation and the public API and MCP routes.

![Build pipeline](media:site-build-pipeline)

### The page system

The homepage is one sortable Date / Project / Scope / All table. Case rows are complete links, and the default order is newest first. The `/all` route derives its articles from those homepage rows, pins the homepage's own `site` entry last in its default order, and keeps explicit sort requests available through query parameters. Case pages receive a generated `View next` table from the same row data, so project metadata is not maintained in a second registry.

The eight case routes are `/filen`, `/heph`, `/ben-davis`, `/t3`, `/ml7`, `/n0thing`, `/curves`, and `/site`. Each route has a structural template, authored Markdown, shared or route-specific bundles, responsive media partials, and generated HTML. The case-study Markdown sources are also published at `/content/<project>.md`.

### The design rules

The palette has one background token and three text colors. A separate pair controls selected text. Light and dark themes change those token values without introducing another palette.

Layout values are named in CSS. The main article column is 760px wide on desktop. It sits beside a 240px sidebar with a 48px gap. A 6px token handles compact link stacks; larger separations use 24px, 32px, 48px, or 80px according to the relationship between elements. Case titles are 28/36 on desktop and 24/32 on mobile. Body copy is 16/24, while captions and code labels use 14/20. Inter Variable is self-hosted for interface text and Ioskeley Mono is used for code.

Links and controls use the gray text tokens at rest and move to the primary text color on direct hover. Keyboard focus uses a visible ring. The Heph demo has a reduced-motion mode; routine controls change state without decorative animation.

```css title="src/styles/10-base.css"
:root {
  --bg: #000000;
  --text-primary: #ffffff;
  --text-secondary: #b3b3b3;
  --text-tertiary: #767676;
  --highlight-bg: #b3b3b3;
  --highlight-text: #ffffff;
  --section-gap: 24px;
  --section-content-gap: 6px;
  --text-media-gap: 32px;
  --link-line-height: 24px;
  --theme-toggle-size: 32px;
  --theme-toggle-optical-offset: 2px;
  --footer-stack-bottom-gap: 4px;
  --footer-title-optical-offset: 4px;
  --sidebar-column: 240px;
  --content-column: 760px;
  --layout-gap: 48px;
  --media-radius: 22px;
}
```

### Verification

`node scripts/verify-page.mjs` builds every route in memory with `write: false`, then compares the result with the committed homepage, case pages, `profile.json`, and `llms-full.txt`. It also checks generated `View next` tables, route order, metadata, JSON-LD, link roles, missing asset references, unreferenced image files, design tokens, homepage entry behavior, the Heph demo contract, and discovery metadata.

`node scripts/check-public.mjs` checks sensitive path names and privacy-pattern matches in the working tree and reachable history, then runs gitleaks against both the directory and Git history.

`node scripts/verify-crawlability.mjs` checks 27 public routes with five crawler user agents. It verifies status, canonical URLs, content types, minimum body sizes, Content-Signal headers, cache behavior, indexability, discovery links, robots policy, and sitemap coverage. The checked set includes the homepage, `/all`, the eight case routes, eight Markdown source routes, and the discovery files.

![Verification harness](media:site-verify-harness)

### The Heph demo

The terminal on the [Heph](/heph) case study is a simulation written in vanilla JavaScript. It plays one retrieval sequence and opens cited evidence. The keyboard controls shown in the interface also work. Reduced-motion users receive the completed state without the timed playback.

### Machine-readable routes

The site publishes a Schema.org identity graph, WebFinger records, host metadata, an `llms.txt` reference, the generated `llms-full.txt` export, an RSS feed, a `humans.txt` file, and a sitemap. The homepage and every case page advertise the relevant Markdown, full-text, profile, and identity references. Its `Content-Signal` header permits search, AI input, and AI training.

### Delivery and access

Functional CSS and JavaScript are inlined by route. The homepage preloads only its self-hosted interface font, and responsive image sets let the browser choose an appropriate file for the viewport. The HTML uses landmarks, live regions, visible keyboard focus, and reduced-motion handling. Cloudflare Pages serves the static output, Functions provide content negotiation and public agent endpoints, and `_headers`, `_redirects`, and `_routes.json` define delivery policy.

The page above is generated by the same system it describes.
