---
name: testing-mobile-web
description: How to build, serve and test the gildrb.com static site in mobile viewports, including real-WebKit (iPhone) touch testing with Playwright for tap-target / theme-toggle style issues.
---

# Testing gildrb.com (static site) in mobile viewports

## Build & serve

No dependencies, no backend, no credentials.

```bash
cd /path/to/web
node scripts/build-page.mjs      # regenerates index.html etc; should leave a clean tree
node scripts/verify-page.mjs     # asserts CSS/JS invariants; expect "Verified generated page, N asset references, M image files."
python3 -m http.server 8123      # serve repo root
```

`verify-page.mjs` asserts specific CSS declarations, so it fails if a style the checked-in assertions expect gets changed — read its output before assuming the build is broken.

For before/after contrast, add a baseline worktree and serve it on a second port:

```bash
git worktree add /tmp/web-main main
cd /tmp/web-main && python3 -m http.server 8124
# cleanup: git worktree remove /tmp/web-main
```

Baseline URLs may need `/index.html` explicitly if that worktree is served without pretty-URL rewriting.

## Which browser to use

- **Layout/visual checks:** Chrome + DevTools device toolbar (Responsive, DPR 3) is fine.
- **Touch behaviour (tap targets, "the button doesn't respond", hover/focus stickiness):** use **real WebKit with an iPhone device context**. Chrome's touch emulation reports `(hover: hover) = true`, so it produces *false* stuck-hover/focus-ring findings that do not exist on iOS. Always re-verify any hover/focus finding in WebKit before reporting it.

```bash
PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 /path/to/.venv-playwright/bin/python
```

```python
from playwright.sync_api import sync_playwright
pw = sync_playwright().start()
b = pw.webkit.launch(headless=False)
ctx = b.new_context(**pw.devices['iPhone 13'])   # 390x844, DPR 3, has_touch
pg = ctx.new_page(); pg.goto('http://localhost:8123/')
pg.touchscreen.tap(x, y)
```

Gotchas:
- **Never resize the headful browser window with `wmctrl -e 0,x,y,w,h`** — it changes the actual viewport (e.g. 390 → 458px) so scripted taps land on the wrong element and look like product bugs. Move windows only: `wmctrl -i -r <id> -e 0,x,y,-1,-1`. `page.set_viewport_size()` can hang in headful WebKit after such a resize; restart the browser instead.
- Playwright's touch API only has `touchscreen.tap()` — there is **no touch drag**. For slide-off / scroll-from-element gestures, dispatch synthetic `PointerEvent`s with `pointerType: 'touch'` and real coordinates, and report them as synthetic (they exercise handler logic, not the browser's gesture recognition or `pointercancel`).
- Touch activation bugs are often **scroll-dependent**: always repeat tap tests at several `scrollY` offsets (0, 50, 200, 800, bottom). WebKit can retarget the synthesized click from a touch to a `display: contents` sticky ancestor after any scroll, so a control that works at the top of the page silently dies once scrolled.
- `Mouse.wheel` is **not supported** in mobile WebKit; touch drags via `mouse.down/move/up` often do not scroll an inner scroll container either. To test "interaction while scrolling", drive `el.scrollTo({top, behavior:'smooth'})` and tap mid-animation instead.
- A click listener injected with `page.evaluate` on a button can intermittently fail to fire in WebKit even though the handler in page code runs. Prefer a **MutationObserver on the observable state** (e.g. `documentElement[data-theme]`) as the counter for "one tap = one action".
- Use `page.bring_to_front()` before taking screen recordings/screenshots when several pages/contexts are open.

## Site-specific facts worth knowing

- Theme state lives in `document.documentElement.dataset.theme`, `localStorage.theme`, and the toggle's `aria-label`; assert all three together.
- The homepage locks page scroll on short viewports (`html.homepage-scroll-locked`) and scrolls `.portfolio-section` instead, with `has-scroll-top`/`has-scroll-bottom` classes driving the gradient shadows — a short viewport (e.g. 390×600) is required to exercise this.
- Mobile contact/links alignment is driven by an inline `--mobile-contact-start` set by `updateMobileLinksLayout` in `src/scripts/10-core.js`, only below 767px; it should be absent at desktop widths.
- Dates swap between full ISO and year-only via a `@container` query on `.portfolio-scroll-frame`.
- Mobile-only tap targets can be enlarged with a layout-neutral `.x::before { position:absolute; inset: ... }` — verify neutrality by diffing `getBoundingClientRect` of the control on branch vs baseline at both mobile and 1440×900, and confirm `content` is `none` at desktop.

## Devin Secrets Needed

None — the site is static and served locally.
