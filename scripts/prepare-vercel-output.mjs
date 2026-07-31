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
    'document.documentElement.dataset.homepageEntryComplete = "true"',
    'event.animationName === "homepage-enter"',
    "window.setTimeout(finishHomepageEntry, 2800)",
    'event.navigationType !== "reload"',
    "event.intercept({",
    "await waitForHomepageReloadPaint()",
    "homepageReloadBypass = true",
    "window.location.reload()",
    "data-homepage-reload-preparing",
    "animation: none !important",
    "opacity: 0 !important",
    "transform: translateY(-4px) !important",
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
        `Exported homepage is missing pre-reload paint behavior:\n${missingFragments.join("\n")}`,
    );
}

const rejectedFragments = [
    "gildrb-homepage-entry-seen",
    'window.addEventListener("beforeunload", prepareHomepageExit',
    'window.addEventListener("pagehide", prepareHomepageExit',
];
const presentRejectedFragments = rejectedFragments.filter((fragment) =>
    homepage.includes(fragment),
);

if (presentRejectedFragments.length > 0) {
    throw new Error(
        `Exported homepage contains superseded reload behavior:\n${presentRejectedFragments.join("\n")}`,
    );
}

console.log(
    "Prepared Vercel output with a painted entry state before hard reload.",
);
