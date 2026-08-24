# gildrb.com

Source for [gildrb.com](https://gildrb.com), a static portfolio built with HTML, CSS, vanilla JavaScript, and Cloudflare Pages Functions.

## Repository layout

- `src/` contains templates, partials, styles, scripts, case-study media, and source data.
- `src/content/` contains authored Markdown for case studies and public reference pages.
- `src/static/` contains files copied to the published site without transformation.
- `scripts/` builds pages, prepares the Pages output, and runs verification checks.
- `functions/` contains the Cloudflare Pages request handlers.
- `public/` is ignored generated output for local previews and deployment.

Generated HTML and metadata should not be edited directly. Change the matching source file, then rebuild the site.

## Commands

```sh
npm run build
npm run verify
```

Both commands rebuild `public/`. `verify` also checks generated pages, discovery metadata, assets, and public-safety rules.
