Source for [gildrb.com](https://gildrb.com), a static portfolio built with HTML, CSS, vanilla JavaScript, and Cloudflare Pages Functions.

## Local development

```sh
npm install
npm run dev
```

Run `poros npm run dev` for a private HTTPS link. Vite starts at port 5174 and automatically tries the next port if it is occupied; use the URL printed by Vite or Poros. It builds the site on startup and rebuilds and refreshes the browser when files in `src/` change. Edit source files, not generated `public/` files.

Vite previews the pages and assets; it does not run Cloudflare Pages Functions or apply Cloudflare headers and redirects. To test those locally, run `npm run build` followed by `npx wrangler pages dev public --port 8788`.

`npm run build` and `npm run verify` keep the existing Cloudflare production output and checks.
