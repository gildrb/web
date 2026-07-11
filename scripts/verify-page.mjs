import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildPage } from "./build-page.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function readText(relativePath) {
    return readFile(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function getGeneratedJsonLd(html) {
    const match = html.match(
        /<script type="application\/ld\+json">\n([\s\S]*?)\n        <\/script>/,
    );

    assert(match, "Missing inline JSON-LD script.");
    return JSON.parse(match[1]);
}

function extractAssetRefs(html) {
    const refs = new Set();
    const addRef = (value) => {
        if (
            !value ||
            value.startsWith("#") ||
            value.startsWith("data:") ||
            value.startsWith("mailto:") ||
            value.startsWith("http://") ||
            value.startsWith("https://") ||
            value.startsWith("/_vercel/")
        ) {
            return;
        }

        if (/\.(?:avif|gif|jpe?g|png|svg|webp|woff2?)$/i.test(value)) {
            refs.add(value.replace(/^\/+/, ""));
        }
    };

    for (const match of html.matchAll(
        /\s(?:href|src|data-preview-src)=["']([^"']+)["']/g,
    )) {
        addRef(match[1]);
    }

    for (const match of html.matchAll(
        /\s(?:srcset|imagesrcset)=["']([^"']+)["']/g,
    )) {
        for (const candidate of match[1].split(",")) {
            addRef(candidate.trim().split(/\s+/)[0]);
        }
    }

    for (const match of html.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
        addRef(match[1]);
    }

    return refs;
}

async function listFiles(relativeDir) {
    const dir = path.join(root, relativeDir);
    const entries = await readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
        entries.map(async (entry) => {
            const relativePath = path.posix.join(relativeDir, entry.name);

            if (entry.isDirectory()) {
                return listFiles(relativePath);
            }

            return [relativePath];
        }),
    );

    return files.flat();
}

const { caseScript, filenHtml, indexHtml, profileJson, siteScript } = await buildPage({
    write: false,
});
const currentIndex = await readText("index.html");
const currentFilen = await readText("index/filen/index.html");
const currentProfile = await readText("profile.json");

assert(
    currentIndex === indexHtml,
    "index.html is out of date. Run `node scripts/build-page.mjs`.",
);
assert(
    currentFilen === filenHtml,
    "index/filen/index.html is out of date. Run `node scripts/build-page.mjs`.",
);
assert(
    currentProfile === profileJson,
    "profile.json is out of date. Run `node scripts/build-page.mjs`.",
);
assert(
    JSON.stringify(getGeneratedJsonLd(indexHtml)) ===
        JSON.stringify(JSON.parse(profileJson)),
    "Inline JSON-LD no longer matches profile.json.",
);

new Function(siteScript);
new Function(caseScript);

const assetRefs = new Set([
    ...extractAssetRefs(indexHtml),
    ...extractAssetRefs(filenHtml),
]);
const missingAssets = [...assetRefs].filter(
    (ref) => !existsSync(path.join(root, ref)),
);

assert(
    missingAssets.length === 0,
    `Missing referenced assets:\n${missingAssets.join("\n")}`,
);

const referencedImages = new Set(
    [...assetRefs].filter((ref) => ref.startsWith("images/")),
);
const imageFiles = (await listFiles("images")).filter(
    (file) => !file.endsWith(".DS_Store"),
);
const unreferencedImages = imageFiles.filter(
    (file) => !referencedImages.has(file),
);

assert(
    unreferencedImages.length === 0,
    `Unreferenced image files:\n${unreferencedImages.join("\n")}`,
);

assert(
    indexHtml.includes('href="/index/filen"'),
    "Homepage does not link to the Filen case study.",
);
assert(
    filenHtml.includes('rel="canonical" href="https://gildrb.com/index/filen"'),
    "Filen case study is missing its canonical URL.",
);
assert(
    filenHtml.includes("gil-rodrigues-filen-exploration-board-1280.webp"),
    "Filen case study is missing the complete exploration board.",
);
assert(
    [480, 720, 960, 1280].every((width) =>
        filenHtml.includes(
            `gil-rodrigues-filen-exploration-board-${width}.webp`,
        ),
    ),
    "Filen case study must provide every optimized full-board image size.",
);
assert(
    !filenHtml.includes("object-fit: cover") &&
        !filenHtml.includes("object-position:"),
    "Filen case study images must preserve their complete frame.",
);
assert(
    !imageFiles.some((file) =>
        /filen-exploration-(?:early|development|refinement)/.test(file),
    ),
    "Cropped Filen exploration derivatives are not allowed.",
);

console.log(
    `Verified generated page, ${assetRefs.size} asset references, ${imageFiles.length} image files.`,
);
