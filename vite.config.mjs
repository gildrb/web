import { existsSync, mkdtempSync, realpathSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { buildPage } from "./scripts/build-page.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(root, "src");
const output = realpathSync(mkdtempSync(path.join(tmpdir(), "gildrb-vite-")));
const cacheDir = `${output}-cache`;
let pending = Promise.resolve();

export default defineConfig({
    root: output,
    cacheDir,
    publicDir: false,
    appType: "mpa",
    server: {
        host: "127.0.0.1",
        port: 5174,
        watch: { ignored: [output + "/**"] },
    },
    plugins: [{
        name: "portfolio-pages",
        async closeBundle() {
            await pending;
            await Promise.all([output, cacheDir].map((directory) =>
                rm(directory, { recursive: true, force: true }),
            ));
        },
        async configureServer(server) {
            await buildPage({ output });
            server.watcher.add(source);
            server.watcher.on("all", (event, file) => {
                if (!["add", "change", "unlink"].includes(event) ||
                    !file.startsWith(source + path.sep)) return;

                pending = pending.then(async () => {
                    try {
                        await buildPage({ output });
                        server.ws.send({ type: "full-reload" });
                    } catch (error) {
                        server.config.logger.error(error.stack);
                        server.ws.send({
                            type: "error",
                            err: { message: error.message, stack: error.stack },
                        });
                    }
                });
            });
            server.middlewares.use(async (request, _response, next) => {
                await pending;
                const url = new URL(request.url, "http://localhost");
                if (!path.extname(url.pathname) &&
                    existsSync(path.join(output, url.pathname, "index.html"))) {
                    request.url = url.pathname.replace(/\/$/, "") +
                        "/index.html" + url.search;
                }
                next();
            });
        },
    }],
});
