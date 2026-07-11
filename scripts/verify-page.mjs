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

const {
    caseScript,
    filenHtml,
    indexHtml,
    ml7Html,
    n0thingHtml,
    profileJson,
    siteScript,
} = await buildPage({ write: false });
const currentIndex = await readText("index.html");
const currentFilen = await readText("filen/index.html");
const currentMl7 = await readText("ml7/index.html");
const currentN0thing = await readText("n0thing/index.html");
const currentProfile = await readText("profile.json");
const caseStyles = await readText("src/styles/50-case-study.css");
const responsiveStyles = await readText("src/styles/90-responsive.css");
const baseStyles = await readText("src/styles/10-base.css");
const previewFavicon = await readText("preview-favicon.svg");
const vercelConfig = JSON.parse(await readText("vercel.json"));

assert(
    currentIndex === indexHtml,
    "index.html is out of date. Run `node scripts/build-page.mjs`.",
);
assert(
    currentFilen === filenHtml,
    "filen/index.html is out of date. Run `node scripts/build-page.mjs`.",
);
assert(
    currentMl7 === ml7Html,
    "ml7/index.html is out of date. Run `node scripts/build-page.mjs`.",
);
assert(
    currentN0thing === n0thingHtml,
    "n0thing/index.html is out of date. Run `node scripts/build-page.mjs`.",
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
assert(
    caseScript.includes('querySelectorAll(".email")') &&
        caseScript.includes("navigator.clipboard") &&
        caseScript.includes("copy-failed"),
    "Case pages must include the shared email-copy behavior.",
);

const assetRefs = new Set([
    ...extractAssetRefs(indexHtml),
    ...extractAssetRefs(filenHtml),
    ...extractAssetRefs(ml7Html),
    ...extractAssetRefs(n0thingHtml),
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
    indexHtml.includes('href="/filen"'),
    "Homepage does not link to the Filen case study.",
);
assert(
    (indexHtml.match(/href="\/filen"/g) || []).length === 1,
    "Only the featured Filen image may link to the case study.",
);
assert(
    indexHtml.includes('class="showcase showcase-full"') &&
        indexHtml.includes(
            '(max-width: 1400px) calc(100vw - 392px), 1476px',
        ),
    "The clickable Filen media must span the full portfolio content width.",
);
assert(
    (indexHtml.match(/href="\/ml7"/g) || []).length === 1,
    "Only the featured mL7 image may link to the case study.",
);
assert(
    (indexHtml.match(/href="\/n0thing"/g) || []).length === 1,
    "Only the featured n0thing image may link to the case study.",
);
assert(
    !indexHtml.includes("project-summary") &&
        !indexHtml.includes("Read the case study"),
    "Homepage Filen entry must remain image-led and concise.",
);
assert(
    filenHtml.includes('rel="canonical" href="https://gildrb.com/filen"'),
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
assert(
    !filenHtml.includes("https://filen.io/"),
    "Filen case study must not link to filen.io.",
);
assert(
    filenHtml.includes('<a class="case-home-link" href="/">Gil Rodrigues</a>') &&
        !filenHtml.includes('>Index</a>') &&
        !filenHtml.includes("Return to the index") &&
        !filenHtml.includes("case-kicker"),
    "Filen navigation must use the persistent Gil Rodrigues to Filen location.",
);
assert(
    ["/index/filen", "/index/filen/"].every((source) =>
        vercelConfig.redirects.some(
            (redirect) =>
                redirect.source === source &&
                redirect.destination === "/filen" &&
                redirect.permanent === true,
        ),
    ),
    "Legacy Filen routes must redirect permanently to /filen.",
);
assert(
    !filenHtml.includes(" · ") &&
        !caseStyles.includes("border-top:") &&
        !caseStyles.includes("border-bottom:"),
    "Filen case study must not introduce dot or rule dividers.",
);
assert(
    ml7Html.includes('rel="canonical" href="https://gildrb.com/ml7"') &&
        ml7Html.includes(
            '<a class="case-home-link" href="/">Gil Rodrigues</a>',
        ) &&
        ml7Html.includes("<span>mL7</span>") &&
        !ml7Html.includes('>Index</a>') &&
        !ml7Html.includes("case-kicker"),
    "mL7 must use the same persistent case-study navigation as Filen.",
);
assert(
    !ml7Html.includes("object-fit: cover") &&
        !ml7Html.includes("object-position:") &&
        !ml7Html.includes(" · "),
    "mL7 must preserve complete images and omit dot dividers.",
);
assert(
    n0thingHtml.includes(
        'rel="canonical" href="https://gildrb.com/n0thing"',
    ) &&
        n0thingHtml.includes(
            '<a class="case-home-link" href="/">Gil Rodrigues</a>',
        ) &&
        n0thingHtml.includes("<span>n0thing</span>") &&
        !n0thingHtml.includes('>Index</a>') &&
        !n0thingHtml.includes("case-kicker"),
    "n0thing must use the same persistent case-study navigation as Filen.",
);
assert(
    !n0thingHtml.includes("object-fit: cover") &&
        !n0thingHtml.includes("object-position:") &&
        !n0thingHtml.includes(" · "),
    "n0thing must preserve complete images and omit dot dividers.",
);
assert(
    [indexHtml, filenHtml, ml7Html, n0thingHtml].every(
        (html) =>
            html.includes('id="site-favicon"') &&
            html.includes('window.location.hostname.endsWith(".vercel.app")') &&
            html.includes('"/preview-favicon.svg"'),
    ),
    "Every page must use the distinct preview favicon on Vercel hosts.",
);
assert(
    previewFavicon.includes(
        '<rect x="10" y="10" width="80" height="80" fill="#000" />',
    ),
    "The preview favicon must reuse the original square geometry in black.",
);
assert(
    baseStyles.includes(
        ".links-label {\n    color: var(--text-secondary);",
    ) &&
        baseStyles.includes(
            ".external-link,\n.reference-link {\n    color: var(--text-primary);",
        ) &&
        baseStyles.includes(
            ".external-link:hover,\n    .reference-link:hover {\n        color: var(--text-secondary);",
        ) &&
        baseStyles.includes(
            ".email {\n    font-size: 16px;\n    font-weight: 400;\n    line-height: var(--link-line-height);\n    color: var(--text-primary);",
        ),
    "Homepage labels and actionable links must preserve the semantic color hierarchy.",
);
assert(
    caseStyles.includes(
            ".case-home-link {\n    color: var(--text-secondary);",
        ) &&
        caseStyles.includes(
            ".case-location span:last-child {\n    color: var(--text-primary);",
        ) &&
        caseStyles.includes(
            ".case-home-link:hover {\n        color: var(--text-secondary);",
        ),
    "Case locations must preserve the active-page hierarchy.",
);
const sharedSidebarTargets = [
    "https://behance.net/gildrb",
    "https://github.com/gildrb",
    "https://www.goodreads.com/gildrb",
    "https://letterboxd.com/gildrb/",
    "https://www.linkedin.com/in/gildrb/",
    "https://signal.me/",
];
assert(
    [indexHtml, filenHtml, ml7Html, n0thingHtml].every(
        (html) =>
            sharedSidebarTargets.every((target) => html.includes(target)) &&
            html.includes('aria-label="Copy hi@gildrb.com"') &&
            html.includes('aria-label="Public profiles and contact"'),
    ),
    "Every generated route must contain the shared profile and contact sidebar.",
);
assert(
    [filenHtml, ml7Html, n0thingHtml].every(
        (html) =>
            !html.includes('class="case-footer"') &&
            html.includes('class="case-desktop-links"') &&
            html.includes('class="case-mobile-links"') &&
            html.indexOf('class="case-mobile-links"') > html.indexOf("</main>"),
    ) &&
        caseStyles.includes(".case-mobile-links {\n    display: none;") &&
        responsiveStyles.includes(
            ".case-page .links {\n        order: 6;\n        margin-top: 80px;",
        ) &&
        responsiveStyles.includes(
            ".case-desktop-links {\n        display: none;",
        ) &&
        responsiveStyles.includes(
            ".case-mobile-links {\n        display: contents;",
        ) &&
        responsiveStyles.includes(
            ".content > * {\n        grid-column: 1 / -1;\n        order: 5;",
        ),
    "Case pages must avoid duplicate email footers and align mobile links DOM, focus, and visual order after the article.",
);

console.log(
    `Verified generated page, ${assetRefs.size} asset references, ${imageFiles.length} image files.`,
);
