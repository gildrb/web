# The site you are on is the case study

The page you are reading is the work. No framework and no site builder. It compiles from my own source through a build pipeline I wrote, and an automated harness holds every page to one design system. I built it to be the clearest evidence that I can take an idea from an empty repository to something shipped, tested, and maintained.

### Built from source through my own pipeline

The whole site compiles from plain source. I author the case-study prose in Markdown and the shared page structure in HTML partials, then a Node build step renders the case studies, assembles the templates, inlines the critical CSS, JavaScript, and structured data, and writes out static routes. There is no client-side framework and no runtime dependency. What ships is small, fast, and entirely mine.

![Build pipeline](media:site-build-pipeline)

### A design system, documented and enforced

The whole site runs on one small design system that I wrote down as a spec and then wired into the build so it cannot drift. The palette is deliberately tight: a single background token and a three-step gray text hierarchy (`--text-primary`, `--text-secondary`, `--text-tertiary`) that flips cleanly between light and dark, plus one shared highlight color for selection. There are no accent colors, gradients, or glows anywhere, and that restraint is the whole idea.

Spacing comes off a 4px scale (4, 8, 12, 16, 24, 32, 48, 64, 80) exposed as named tokens, so a 760px content column, a 240px sidebar, and a 48px layout gap are decisions I made once and reuse everywhere. Type is self-hosted Inter Variable with Geist Mono for code, on a fixed ramp: 28/36 for titles, 24/32 for section headings, 16/24 for body, 14/20 for captions, nothing lighter than weight 400, and no fluid font sizing. Interaction is just as strict: links and controls promote from tertiary to primary gray on hover, focus shows a 1px ring at a 4px offset, selection uses the bright-gray highlight, and any motion stays at or below 200ms and yields to reduced-motion.

The spec is enforced in code. The build refuses to ship a page that violates the tokens, the type hierarchy, or the spacing rules, so the written system and the live site can never quietly disagree.

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
    --footer-stack-bottom-gap: 4px;
    --footer-title-optical-offset: 4px;
    --sidebar-column: 240px;
    --content-column: 760px;
    --layout-gap: 48px;
    --media-radius: 22px;
}
```

### I wrote tests for my own portfolio

This is the part I am proudest of. A verification harness runs on every build and checks more than eighty assertions before anything is allowed to ship. It enforces the design-system colors and spacing, the content rules (caption length, project order, and a hard ban on em dashes), and asset completeness, so there are never missing or unreferenced images. It also rebuilds every page from source and fails if the committed HTML has drifted by even a character. If the site stops matching its own rules, the build breaks.

![Verification harness](media:site-verify-harness)

### Interactive, written from scratch

The terminal on the Heph case study is a from-scratch simulation of a Heph session written in vanilla JavaScript. It plays a timed retrieval animation, shows evidence you can open, and exposes the real keyboard model, all while staying accessible and respecting reduced-motion preferences. It is a small, deliberate piece of interaction design that runs without a single dependency.

### Readable by machines

I treated discovery as a design surface. The site publishes a Schema.org identity graph as JSON-LD, a WebFinger and host-meta record, an llms.txt profile written for AI agents, an RSS feed, a humans.txt file, and a sitemap. It also serves Content-Signal headers that state plainly how the site may be searched, used as AI input, or used for training. A person, a search engine, and an AI agent all get the same clear answer about who I am.

### Fast and accessible by default

Performance and accessibility were requirements from the start. Critical CSS and JavaScript are inlined, fonts are preloaded, images are served responsively with the right size for each viewport, and the markup uses real landmarks, live regions for status updates, visible focus rings, and reduced-motion fallbacks. It loads fast and holds up whether you are on a phone, using a keyboard, or reading with a screen reader.

Everything here is my design and my code, held to a standard I would defend on any team. This whole page is the work, and you are reading it right now.
