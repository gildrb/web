import { cp, mkdir, readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "public");
const excludedEntries = new Set([
    ".git",
    ".github",
    "functions",
    "node_modules",
    "public",
    "scripts",
    "package.json",
    "package-lock.json",
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
const homepageByteBudget = 128 * 1024;
if (Buffer.byteLength(homepage) > homepageByteBudget) {
    throw new Error(
        `Exported homepage exceeds its ${homepageByteBudget}-byte uncompressed budget.`,
    );
}
const requiredFragments = [
    'window.localStorage.getItem("theme")',
    "font-display:optional",
    "data-cfasync=\"false\"",
    "<!--email_off-->",
];
const missingFragments = requiredFragments.filter(
    (fragment) => !homepage.includes(fragment),
);

if (missingFragments.length > 0) {
    throw new Error(
        `Exported homepage is missing first-paint stabilization:\n${missingFragments.join("\n")}`,
    );
}

const themeBootstrapIndex = homepage.indexOf(
    'window.localStorage.getItem("theme")',
);
const inlineStyleIndex = homepage.indexOf("<style>");

if (
    themeBootstrapIndex < 0 ||
    inlineStyleIndex < 0 ||
    themeBootstrapIndex > inlineStyleIndex
) {
    throw new Error(
        "Saved theme must be resolved before the homepage CSS is parsed.",
    );
}

const rejectedFragments = [
    "font-display:swap",
    "homepage-first-paint-pending",
    'document.fonts.load(\'400 16px "Inter"\')',
    "IoskeleyMono-Regular.woff2\" as=\"font",
    "gildrb-homepage-entry-seen",
    'window.addEventListener("beforeunload", prepareHomepageExit',
    'window.addEventListener("pagehide", prepareHomepageExit',
    'event.navigationType !== "reload"',
    "event.intercept({",
];
const presentRejectedFragments = rejectedFragments.filter((fragment) =>
    homepage.includes(fragment),
);

if (presentRejectedFragments.length > 0) {
    throw new Error(
        `Exported homepage contains superseded first-paint behavior:\n${presentRejectedFragments.join("\n")}`,
    );
}

console.log(
    "Prepared performance-first Cloudflare Pages output without render gates or unused font preloads.",
);
