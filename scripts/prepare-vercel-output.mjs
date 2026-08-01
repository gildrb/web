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
    "homepage-first-paint-pending",
    "data-homepage-first-paint-ready",
    "data-homepage-entry-complete",
    'window.localStorage.getItem("theme")',
    "font-display:optional",
    "window.homepageFirstPaintReady = prepareHomepageFirstPaint()",
    'document.fonts.load(\'400 16px "Inter"\')',
    "Promise.resolve(window.homepageFirstPaintReady)",
    'document.documentElement.dataset.homepageEntryComplete = "true"',
    'event.animationName === "homepage-enter"',
    "window.setTimeout(finishHomepageEntry, 2800)",
    "animation: homepage-enter 700ms ease-out both",
    "animation-delay: 720ms",
    "animation-delay: 1320ms",
    "animation-delay: 1440ms",
    "animation-delay: 1560ms",
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
    "Prepared Vercel output with theme, font, and layout stabilized before entry motion.",
);
