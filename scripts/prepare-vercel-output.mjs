import { cp, mkdir, readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "public");
const excludedEntries = new Set([
    ".git",
    ".github",
    ".vercel",
    "node_modules",
    "public",
    "scripts",
    "package.json",
    "package-lock.json",
    "vercel.json",
]);

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const entry of await readdir(root, { withFileTypes: true })) {
    if (excludedEntries.has(entry.name)) continue;

    await cp(path.join(root, entry.name), path.join(output, entry.name), {
        recursive: true,
    });
}

const homepage = await readFile(path.join(output, "index.html"), "utf8");

if (!homepage.includes("@keyframes homepage-enter")) {
    throw new Error("Exported homepage is missing the entry-animation CSS.");
}

console.log("Prepared Vercel output in public/ with homepage animation included.");
