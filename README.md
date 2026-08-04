### gildrb.com

The source for [gildrb.com](https://gildrb.com), a static portfolio built with HTML, CSS, and vanilla JavaScript. Lots of text is currently a placeholder

### Cloudflare Pages deployment

1. Create a Pages project from `gildrb/web` in the same Cloudflare account as the `gildrb.com` zone.
2. Set the production branch to `main`, build command to `npm run build`, and output directory to `public`. No environment variables or secrets are required.
3. Verify the generated `*.pages.dev` deployment, including Markdown negotiation and `/mcp`.
4. In the Pages project, open **Custom domains**, add `gildrb.com`, and allow Cloudflare to replace the existing Vercel-targeting apex record with the Pages CNAME.
5. Add `www.gildrb.com` as a second custom domain. The repository redirects it permanently to the apex.

Do not delete the current origin record before the `*.pages.dev` deployment passes validation. After cutover, `curl -I https://gildrb.com/` should report `server: cloudflare` and include `cf-ray`.
