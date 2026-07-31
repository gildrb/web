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
const requiredFragments = [
    "@keyframes homepage-enter",
    "data-homepage-entry-complete",
    "window.setTimeout(finishHomepageEntry, 4400)",
    'document.documentElement.dataset.homepageEntryComplete = "true"',
    "animation-delay: 2200ms",
];
const missingFragments = requiredFragments.filter(
    (fragment) => !homepage.includes(fragment),
);

if (missingFragments.length > 0) {
    throw new Error(
        `Exported homepage is missing one-time entry behavior:\n${missingFragments.join("\n")}`,
    );
}

console.log(
    "Prepared Vercel output in public/ with one-time homepage entry behavior.",
);
