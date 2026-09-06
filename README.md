Source for [gildrb.com](https://gildrb.com), a static portfolio built with HTML, CSS, vanilla JavaScript, and Cloudflare Pages Functions.

## Local development

```sh
npm install
npm run dev
```

Open http://localhost:5174. Vite builds the site on startup and rebuilds and refreshes the browser when files in `src/` change. Edit source files, not generated `public/` files. Port 5174 avoids the existing Taxis server on 5173.

Vite previews the pages and assets; it does not run Cloudflare Pages Functions or apply Cloudflare headers and redirects. To test those locally, run `npm run build` followed by `npx wrangler pages dev public --port 8788`.

`npm run build` and `npm run verify` keep the existing Cloudflare production output and checks.
