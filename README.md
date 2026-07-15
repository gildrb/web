# gildrb.com

The source for [gildrb.com](https://gildrb.com), a static portfolio built with HTML, CSS, and vanilla JavaScript.

## Architecture

- `src/` contains the authored page templates, partials, styles, scripts, media fragments, and structured profile data.
- `content/` contains the Markdown source for each case study.
- `scripts/site-config.mjs` is the route and script-bundle registry shared by the builder and verifier.
- `scripts/build-page.mjs` composes the source into deployable static files.
- `scripts/verify-page.mjs` checks generated-file drift, content contracts, asset references, and interaction invariants.
- `images/optimized/` and `fonts/` contain the production assets used by the generated pages.
- `index.html`, `profile.json`, and each `<case-study>/index.html` are generated deployment artifacts. Edit their sources instead.

The repository intentionally has no framework, package manager, application runtime dependency, or client-side module loader. The build scripts use Node.js standard-library APIs only; the deployed website remains ordinary static files.

## Development

Edit files under `src/` or `content/`, then rebuild and verify:

```sh
node scripts/build-page.mjs
node scripts/verify-page.mjs
```

For case-study authoring conventions, see [`content/README.md`](content/README.md).

## Public-safety check

Before changing the repository visibility or publishing history, install [Gitleaks](https://github.com/gitleaks/gitleaks) and run:

```sh
node scripts/check-public.mjs
```

The check scans tracked, ignored, and untracked files; publishable branches, tags, and remote-tracking history; sensitive filenames; credentials; private keys; local machine paths; private-network addresses; and secret-manager references. It also lists commit-author emails for a final manual privacy review.

## Deployment

Vercel serves the generated files directly. `vercel.json` owns redirects, caching, and security headers; there is no server process or build-time application runtime.
