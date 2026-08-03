import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildPage } from "./build-page.mjs";
import { siteConfig } from "./site-config.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function readText(relativePath) {
    return readFile(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function getCssDeclarations(css, selector) {
    const declarations = {};

    for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const selectors = match[1]
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean);
        if (!selectors.includes(selector)) continue;

        for (const declaration of match[2].split(";")) {
            const separator = declaration.indexOf(":");
            if (separator === -1) continue;
            declarations[declaration.slice(0, separator).trim()] = declaration
                .slice(separator + 1)
                .trim();
        }
    }

    return declarations;
}

function getAttributes(source) {
    return Object.fromEntries(
        [...source.matchAll(/([a-z-]+)="([^"]*)"/g)].map((match) => [
            match[1],
            match[2],
        ]),
    );
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

function extractPortfolioCases(html) {
    return [
        ...html.matchAll(
            /<a\s+class="portfolio-card-link"\s+href="\/([^"?]+)"[\s\S]*?<time[^>]+datetime="([^"]+)"[\s\S]*?<span\s+class="portfolio-card-title"[^>]*>([^<]+)<\/span\s*>[\s\S]*?<span\s+class="portfolio-card-scope">([^<]+)<\/span>/g,
        ),
    ].map(([, slug, date, title, scope]) => ({
        date,
        scope,
        slug,
        title,
    }));
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
    allPage,
    allScript,
    casePages,
    caseScripts,
    fullSiteText,
    indexHtml,
    profileJson,
    siteScript,
} = await buildPage({ write: false });
const {
    filen: filenHtml,
    heph: hephHtml,
    ml7: ml7Html,
    n0thing: n0thingHtml,
    curves: curvesHtml,
    "ben-davis": benDavisHtml,
    t3: t3Html,
    site: siteHtml,
} = casePages;
const caseScript = caseScripts.filen;
const caseHtml = Object.values(casePages);
const allHtml = [indexHtml, ...caseHtml];
const portfolioCases = extractPortfolioCases(indexHtml);
const configuredCaseSlugs = new Set(
    siteConfig.caseStudies.map(({ slug }) => slug),
);
const suggestionBlockPattern =
    /<nav class="case-next" aria-label="All projects">([\s\S]*?)<\/nav>/g;
const suggestionRowPattern =
    /<a class="case-next-row case-next-link" href="\/([^"]+)"(?: aria-current="page")?>[\s\S]*?<time datetime="([^"]+)">[\s\S]*?<span class="case-next-project">([^<]+)<\/span>[\s\S]*?<span class="case-next-scope">([^<]+)<\/span>/g;
for (const [slug, html] of Object.entries(casePages)) {
    const blocks = [...html.matchAll(suggestionBlockPattern)];
    assert(
        blocks.length === 1,
        `${slug} must contain exactly one suggested-projects navigation block.`,
    );
    const suggestions = [
        ...blocks[0][1].matchAll(suggestionRowPattern),
    ].map(([, targetSlug, date, title, scope]) => ({
        date,
        scope,
        slug: targetSlug,
        title,
    }));
    assert(
        suggestions.length === portfolioCases.length &&
            (html.match(
                new RegExp(
                    `<a class="case-next-row case-next-link" href="/${slug}" aria-current="page">`,
                ),
            ) || []).length === 1 &&
            suggestions.every(
                ({ slug: targetSlug, date, title, scope, tag }, index) => {
                    const target = portfolioCases.find(
                        (portfolioCase) => portfolioCase.slug === targetSlug,
                    );
                    const expectedTarget = portfolioCases[index];
                    return (
                        expectedTarget?.slug === targetSlug &&
                        configuredCaseSlugs.has(targetSlug) &&
                        target !== undefined &&
                        target.date === date &&
                        target.title === title &&
                        target.scope === scope &&
                        true
                    );
                },
            ),
        `${slug} must expose every configured project once in homepage order, with no self-link.`,
    );
}
assert(
    (allPage.match(/class="case-next"/g) || []).length === 0,
    "The all-projects page must not contain suggested-projects navigation.",
);
assert(
    !allPage.includes("case-next.js") &&
        !allPage.includes('class="case-next"'),
    "The all-projects page must not include case-next scripts or markup.",
);
const currentIndex = await readText("index.html");
const currentCasePages = Object.fromEntries(
    await Promise.all(
        siteConfig.caseStudies.map(async ({ slug }) => [
            slug,
            await readText(`${slug}/index.html`),
        ]),
    ),
);
const currentProfile = await readText("profile.json");
const currentFullSiteText = await readText("llms-full.txt");
const llmsText = await readText("llms.txt");
const wellKnownLlmsText = await readText(".well-known/llms.txt");
const contentGuide = await readText("content/README.md");
const homepageMarkdown = await readText("index.html.md");
const humansText = await readText("humans.txt");
const sitemapText = await readText("sitemap.xml");
const feedText = await readText("feed.xml");
const identityTexts = await Promise.all(
    [
        ".well-known/llms.txt",
        ".well-known/webfinger",
        "feed.xml",
        "humans.txt",
        "index.html",
        "index.html.md",
        "llms.txt",
        "profile.json",
        "llms-full.txt",
        siteConfig.profileSource,
        "src/page.template.html",
        "src/partials/layout-open.html",
        "src/sections/profile-summary.html",
    ].map(async (file) => ({ file, text: await readText(file) })),
);
const caseStyles = await readText("src/styles/50-case-study.css");
const responsiveStyles = await readText("src/styles/90-responsive.css");
const baseStyles = await readText("src/styles/10-base.css");
const portfolioStyles = await readText("src/styles/20-portfolio-media.css");
const hephDemoStyles = await readText("src/styles/30-heph-demo.css");
const benDavisStyles = await readText("src/styles/30-ben-davis.css");
const hephMarkdown = await readText("content/heph.md");
const previewContentStyles = await readText("src/styles/40-preview-content.css");
const portfolioOpen = await readText("src/sections/portfolio-open.html");
const previewFavicon = await readText("preview-favicon.svg");
const vercelConfig = JSON.parse(await readText("vercel.json"));
const vercelHeaderSources = new Map(
    vercelConfig.headers.map(({ headers, source }) => [source, headers]),
);
const sharedCacheFreshnessToken = ["s", "maxage"].join("-");
const staleRevalidationToken = ["stale", "while", "revalidate"].join("-");
const caseSources = await Promise.all(
    siteConfig.caseStudies.map(async ({ slug, title }) => ({
        slug,
        title,
        markdown: await readText(`content/${slug}.md`),
        template: await readText(`src/${slug}.template.html`),
    })),
);
assert(
    indexHtml.includes("<title>Gil Rodrigues</title>"),
    "The homepage browser title must be only Gil Rodrigues.",
);
assert(
    indexHtml.includes(
        '<meta\n            name="description"\n            content="Brand designer based in Germany, building identity systems for software."',
    ) &&
        indexHtml.includes("<span data-nosnippet>Links</span>") &&
        indexHtml.includes("<span data-nosnippet>About</span>") &&
        indexHtml.includes(
            "Brand designer based in Germany, building\n                            identity systems for software.",
        ),
    "The homepage must keep its canonical description eligible for search snippets and exclude navigation labels.",
);
for (const { slug, title, markdown, template } of caseSources) {
    assert(
        markdown.startsWith("# ") &&
            [0, 3].includes(
                (markdown.match(/^- \*\*[^*]+:\*\* .+$/gm) || []).length,
            ),
        `content/${slug}.md must begin with a title and use zero or three metadata rows.`,
    );
    assert(
        template.includes(`<!-- @case-markdown:${slug} -->`) &&
            !template.includes('class="case-title"') &&
            !template.includes('class="case-copy"'),
        `src/${slug}.template.html must keep authored prose in content/${slug}.md.`,
    );
    assert(
        template.includes(`<title>${title}</title>`),
        `src/${slug}.template.html must use only the project name as its browser title.`,
    );
    assert(
        template.includes("https://gildrb.com/llms.txt") &&
            template.includes("https://gildrb.com/llms-full.txt") &&
            template.includes(`https://gildrb.com/content/${slug}.md`) &&
            template.includes("https://gildrb.com/profile.json"),
        `src/${slug}.template.html must expose LLM, full-text, Markdown source, and structured profile discovery links.`,
    );
    const mediaCaptions = [
        ...markdown.matchAll(/^!\[(.*)\]\(media:[a-z0-9-]+\)$/gm),
    ].map(([, caption]) => caption.trim());
    const allowedLongMediaCaptions =
        slug === "t3"
            ? new Set([
                  "The application board posted for feedback",
                  "Feedback on the spacing between the glyphs",
                  "The repainted board",
                  "The thinner test and the reply",
                  "Nine frames and the replies they drew",
                  "The angled 3, and the verdict on it",
                  "The pinched curve against the smoothed one",
              ])
            : new Set();
    assert(
        mediaCaptions.every(
            (caption) =>
                caption &&
                (caption.split(/\s+/).length <= 5 ||
                    allowedLongMediaCaptions.has(caption)),
        ),
        `content/${slug}.md media captions must contain one to five words.`,
    );
    const authoredBody = markdown
        .split("\n")
        .slice(1)
        .some((line) => {
            const trimmed = line.trim();
            return (
                trimmed &&
                !trimmed.startsWith("!") &&
                !trimmed.startsWith("#") &&
                !trimmed.startsWith("- **")
            );
        });
    assert(
        authoredBody || markdown.trimEnd().endsWith("## MORE SOON"),
        `content/${slug}.md must contain authored prose or end with ## MORE SOON.`,
    );
}

const proseLinks = caseHtml.flatMap((html) =>
    [...html.matchAll(/<div class="case-copy">([\s\S]*?)<\/div>/g)].flatMap(
        (copy) =>
            [...copy[1].matchAll(/<a\s+([^>]+)>/g)].map((link) =>
                getAttributes(link[1]),
            ),
    ),
);
assert(
    proseLinks.every(({ class: className = "", href, target, rel }) => {
        const classes = new Set(className.split(/\s+/).filter(Boolean));
        const isInternal = classes.has("internal-link");
        const isExternal = classes.has("external-link");

        if (isInternal === isExternal) return false;
        if (isInternal) {
            return href?.startsWith("/") && !target && !rel;
        }

        return (
            /^https:\/\//.test(href ?? "") &&
            target === "_blank" &&
            new Set((rel ?? "").split(/\s+/)).has("noopener") &&
            new Set((rel ?? "").split(/\s+/)).has("noreferrer")
        );
    }),
    "Every case-study prose link must declare a valid internal or external link role; bare anchors are forbidden.",
);

for (const linkRole of ["internal-link", "external-link"]) {
    const resting = getCssDeclarations(baseStyles, `.${linkRole}`);
    const hover = getCssDeclarations(baseStyles, `.${linkRole}:hover`);
    const focus = getCssDeclarations(baseStyles, `.${linkRole}:focus-visible`);
    assert(
        resting.color === "var(--text-tertiary)" &&
            resting["text-decoration"] === "none" &&
            hover.color === "var(--text-primary)" &&
            focus.color === "var(--text-primary)" &&
            (focus.outline || focus["box-shadow"]),
        `.${linkRole} must define token-based resting, hover, and keyboard-focus states without browser-default styling.`,
    );
}

assert(
    currentIndex === indexHtml,
    "index.html is out of date. Run `node scripts/build-page.mjs`.",
);
for (const { slug } of siteConfig.caseStudies) {
    assert(
        currentCasePages[slug] === casePages[slug],
        `${slug}/index.html is out of date. Run \`node scripts/build-page.mjs\`.`,
    );
}
assert(
    currentProfile === profileJson,
    "profile.json is out of date. Run `node scripts/build-page.mjs`.",
);
assert(
    currentFullSiteText === fullSiteText,
    "llms-full.txt is out of date. Run `node scripts/build-page.mjs`.",
);
assert(
    JSON.stringify(getGeneratedJsonLd(indexHtml)) ===
        JSON.stringify(JSON.parse(profileJson)),
    "Inline JSON-LD no longer matches profile.json.",
);
const staleRolePattern = new RegExp(
    `${["design", "engineer"].join("\\s+")}\\b`,
    "i",
);
const staleIdentityPattern =
    /student(?: and designer)?|Julius-Maximilians|Würzburg/i;
const staleIdentityFiles = identityTexts
    .filter(
        ({ text }) =>
            staleIdentityPattern.test(text) || staleRolePattern.test(text),
    )
    .map(({ file }) => file);
assert(
    staleIdentityFiles.length === 0,
    `Stale student or university identity copy found in:\n${staleIdentityFiles.join("\n")}`,
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
    ...caseHtml.flatMap((html) => [...extractAssetRefs(html)]),
]);
const missingAssets = [...assetRefs].filter(
    (ref) => !existsSync(path.join(root, ref)),
);

assert(
    missingAssets.length === 0,
    `Missing referenced assets:\n${missingAssets.join("\n")}`,
);

assert(
    baseStyles.includes("--highlight-bg: #b3b3b3;") &&
        baseStyles.includes("--highlight-text: #ffffff;") &&
        baseStyles.includes("color: var(--highlight-text);") &&
        baseStyles.includes("background: var(--highlight-bg);") &&
        portfolioStyles.includes(
            ".portfolio-card-link:hover {\n        color: var(--text-primary);",
        ) &&
        portfolioStyles.includes(
            ".portfolio-card-link:hover .portfolio-card-view {\n        visibility: visible;",
        ) &&
        portfolioStyles.includes(
            ".portfolio-card-link:hover .portfolio-card-arrow {\n        color: var(--text-primary);",
        ) &&
        !portfolioStyles.includes("background: color-mix(") &&
        !portfolioStyles.includes(".portfolio-card-image::after") &&
        !hephDemoStyles.includes(".heph-demo-frame::after") &&
        !portfolioStyles.includes("mix-blend-mode:") &&
        !caseStyles.includes(".case-study-entry:hover img"),
    "Clickable project rows must brighten their date and arrow to white on hover without a hover background or image dimming.",
);

const hephDemoHexColors = new Set(
    [...hephDemoStyles.matchAll(/#[0-9a-f]{6}/gi)].map(([color]) => color.toLowerCase()),
);
assert(
    hephDemoStyles.includes(
        ".heph-demo-input {\n        width: 160%;\n        font-size: 16px;\n        transform: scale(0.625);\n        transform-origin: left center;",
    ),
    "The mobile Heph input must retain a 16px computed font size without changing its 10px visual scale.",
);
assert(
    hephDemoStyles.includes("--heph-demo-terminal-bg: color-mix(") &&
        hephDemoStyles.includes("var(--bg) 96%") &&
        hephDemoStyles.includes("--heph-demo-row-bg: color-mix(") &&
        hephDemoStyles.includes("var(--bg) 94%") &&
        hephDemoStyles.includes("--heph-demo-mobile-bg: color-mix(") &&
        hephDemoStyles.includes("var(--bg) 92%") &&
        hephDemoStyles.includes("color: var(--text-primary);") &&
        hephDemoStyles.includes("color: var(--text-secondary);") &&
        hephDemoStyles.includes("color: var(--text-tertiary);") &&
        [...hephDemoHexColors].every((color) =>
            ["#f96664", "#face2e", "#3bc55d"].includes(color),
        ) &&
        hephHtml.includes("EVIDENCE <b>ctrl+g</b>") &&
        hephHtml.includes("SCOPE <b>4/4</b>") &&
        hephHtml.includes("EXCERPTS <b>4</b>") &&
        caseScripts.heph.includes('hephDemoEvidenceOpen.innerHTML = "EVIDENCE <b>ctrl+g</b>"') &&
        caseScripts.heph.includes('hephDemoEvidenceMeta.innerHTML = "EXCERPTS <b>4</b>"'),
    "Heph must theme its surface and use shared primary, label, and value colors plus the macOS lights.",
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
    !indexHtml.includes("portfolio-personal-title") &&
        !indexHtml.includes('class="image-preview"') &&
        !siteScript.includes("Image Preview Open") &&
        !siteScript.includes("imagePreview") &&
        !siteScript.includes("closeImagePreview") &&
        siteScript.includes("item.getClientRects().length > 0") &&
        siteScript.includes(
            'getComputedStyle(item).visibility !== "hidden"',
        ) &&
        !imageFiles.some((file) => file.includes("personal-")),
    "Removed Personal media and its preview machinery must stay absent, and arrow navigation must omit hidden controls.",
);
const homepageFooter =
    indexHtml.match(/<footer class="site-footer">[\s\S]*?<\/footer>/)?.[0] ??
    "";
assert(
    homepageFooter.includes('aria-label="Metadata"') &&
        homepageFooter.includes('<p class="links-label">Metadata</p>') &&
        homepageFooter.includes('href="humans.txt"') &&
        homepageFooter.includes('href="llms.txt"') &&
        homepageFooter.includes('href="https://github.com/gildrb/web"') &&
        !homepageFooter.includes("llms-full.txt") &&
        (homepageFooter.match(/class="reference-link"/g) || []).length === 3 &&
        allHtml.every(
            (html) =>
                !html.includes('class="copyright"') &&
                !html.includes('id="copyright-year"'),
        ) &&
        caseHtml.every(
            (html) => !html.includes('class="site-footer"'),
        ),
    "The homepage-only footer must keep the three visible Metadata links without a copyright label.",
);
const hephAsciiSignature =
    "HEPH // BRANDMARK RASTER 64x22 // GIL RODRIGUES / GILDRB";
assert(
    [llmsText, wellKnownLlmsText].every(
        (text) =>
            text.includes(hephAsciiSignature) &&
            text.includes("SYSTEM // LOCAL DOCUMENT AGENT") &&
            text.includes("SOURCE // github.com/gildrb/heph"),
    ),
    "Both LLM references must carry the authored Heph ASCII brandmark.",
);
const llmFullTextRoute = "https://gildrb.com/llms-full.txt";
assert(
    [
        indexHtml,
        homepageMarkdown,
        llmsText,
        wellKnownLlmsText,
        humansText,
        sitemapText,
        currentFullSiteText,
        await readText(".well-known/webfinger"),
        await readText(".well-known/host-meta"),
        await readText(".well-known/host-meta.json"),
    ].every((text) => text.includes(llmFullTextRoute)) &&
        currentFullSiteText.includes(
            "This file is generated from the same authored Markdown sources as the website.",
        ) &&
        siteConfig.caseStudies.every(({ slug }) =>
            currentFullSiteText.includes(
                `Markdown source: https://gildrb.com/content/${slug}.md`,
            ),
        ),
    "Public discovery files must advertise the full public website text endpoint.",
);
assert(
    vercelHeaderSources.has("/llms-full.txt") &&
        vercelHeaderSources.has("/content/(.*)") &&
        JSON.stringify(vercelConfig.headers).includes(llmFullTextRoute) &&
        !JSON.stringify(
            vercelConfig.headers.filter(
                ({ source }) =>
                    source !== "/images/(.*)" && source !== "/fonts/(.*)",
            ),
        ).includes(sharedCacheFreshnessToken) &&
        !JSON.stringify(vercelConfig.headers).includes(
            staleRevalidationToken,
        ),
    "Vercel headers must expose the full-text and content Markdown routes without shared-cache stale windows.",
);
const documentedPortfolioTexts = [
    llmsText,
    wellKnownLlmsText,
    homepageMarkdown,
    humansText,
    currentFullSiteText,
];
assert(
    siteConfig.caseStudies.every(({ slug }) =>
        documentedPortfolioTexts.every((text) =>
            text.includes(`https://gildrb.com/${slug}`),
        ),
    ) &&
        siteConfig.caseStudies.every(({ slug }) =>
            sitemapText.includes(`<loc>https://gildrb.com/${slug}</loc>`),
        ) &&
        siteConfig.caseStudies.every(({ slug }) =>
            sitemapText.includes(
                `<loc>https://gildrb.com/content/${slug}.md</loc>`,
            ),
        ) &&
        siteConfig.caseStudies.every(({ slug }) =>
            feedText.includes(`<link>https://gildrb.com/${slug}</link>`),
        ),
    "Public agent references, the sitemap, and the feed must enumerate every configured case-study route.",
);
const profileGraph = JSON.parse(profileJson)["@graph"];
const websiteProfile = profileGraph.find(
    (entry) => entry["@id"] === "https://gildrb.com/#website",
);
assert(
    siteConfig.caseStudies.every(({ slug }) =>
        profileGraph.some(
            (entry) =>
                entry["@id"] ===
                `https://gildrb.com/${slug}#case-study`,
        ),
    ) &&
        websiteProfile &&
        websiteProfile.hasPart.some(
            (entry) =>
                entry["@id"] ===
                "https://gildrb.com/llms-full.txt#full-public-text",
        ) &&
        siteConfig.caseStudies.every(({ slug }) =>
            websiteProfile.hasPart.some(
                (entry) =>
                    entry["@id"] ===
                    `https://gildrb.com/${slug}#case-study`,
            ),
        ),
    "The structured profile must expose every configured case study as part of the website.",
);
assert(
    siteConfig.caseStudies.every(({ slug }) =>
        contentGuide.includes(`- \`${slug}.md\``),
    ),
    "The tracked content guide must enumerate every configured case study.",
);
assert(
    (await readText("src/styles/30-heph-demo.css")).includes(
        "margin-bottom: 32px;",
    ) &&
        !responsiveStyles.includes(
            ".heph-demo {\n        margin-bottom: 80px;",
        ),
    "The Heph-to-Filen gap must use the optically compensated 32px project rhythm.",
);
assert(
    !indexHtml.includes('<div class="heph-demo-frame">') &&
        !indexHtml.includes('class="heph-demo-shell"') &&
        hephHtml.includes('<div class="heph-demo-frame">') &&
        (await readText("src/styles/30-heph-demo.css")).includes(
            ".heph-demo-frame {\n        padding: 34px 14px;\n        border-radius: 24px;\n        background: var(--heph-demo-mobile-bg);",
        ),
    "The interactive Heph demo must live only on the Heph case study, keeping its mobile chrome there and off the homepage.",
);
assert(
    !indexHtml.includes(".heph-demo {") &&
        !siteScript.includes("const hephDemoEvidenceOpen") &&
        Object.entries(casePages).every(
            ([slug, html]) =>
                slug === "heph" ||
                (!html.includes(".heph-demo {") &&
                    !html.includes("const hephDemoEvidenceOpen") &&
                    !html.includes(".heph-lockup")),
        ) &&
        hephHtml.includes(".heph-demo {") &&
        hephHtml.includes("const hephDemoEvidenceOpen") &&
        hephHtml.includes(".heph-lockup"),
    "Heph component styles and behavior must be bundled only into the Heph case study.",
);
assert(
    benDavisStyles.includes(
        ".case-media .ben-davis-brandmark {\n    width: 88%;\n    border-radius: 0;\n    filter: none;",
    ) &&
        benDavisStyles.includes(
            "@media (prefers-color-scheme: light) {\n    :root:not([data-theme]) .ben-davis-brandmark {\n        filter: brightness(0);",
        ) &&
        benDavisStyles.includes(
            ':root[data-theme="light"] .ben-davis-brandmark {\n    filter: brightness(0);',
        ) &&
        benDavisStyles.includes(
            ':root[data-theme="dark"] .ben-davis-brandmark {\n    filter: none;',
        ) &&
        Object.entries(casePages).every(
            ([slug, html]) =>
                slug === "ben-davis" ||
                !html.includes("ben-davis-brandmark"),
        ) &&
        benDavisHtml.includes('class="ben-davis-brandmark"'),
    "The Ben Davis brandmark must use isolated light/dark theme-inverting CSS only on its case study.",
);
assert(
    hephMarkdown.includes("![Heph demo](media:heph-demo)") &&
        hephHtml.includes('class="heph-demo case-heph-demo"') &&
        hephHtml.indexOf('class="heph-demo case-heph-demo"') <
            hephHtml.indexOf(">GitHub repository</a>"),
    "The Heph case study must place the shared demo before the repository link.",
);
const hephMediaSequence = [
    'class="heph-demo case-heph-demo"',
    "gil-rodrigues-heph-interface-960.webp",
    "gil-rodrigues-heph-typeface-early-960.webp",
    "gil-rodrigues-heph-typeface-refinement-960.webp",
    "gil-rodrigues-heph-lockup.svg",
];
assert(
    hephMediaSequence.every((asset, index) => {
        const position = hephHtml.indexOf(asset);
        const previousPosition =
            index === 0 ? -1 : hephHtml.indexOf(hephMediaSequence[index - 1]);
        return position > previousPosition;
    }) && !hephHtml.includes("\u2014"),
    "Heph media must follow the documented chronology and omit em dashes.",
);
assert(
    hephHtml.includes('class="heph-lockup"') &&
        hephDemoStyles.includes(
            ".case-media .heph-lockup {\n    width: 88%;\n    border-radius: 0;",
        ) &&
        hephDemoStyles.includes(':root:not([data-theme]) .heph-lockup') &&
        hephDemoStyles.includes(':root[data-theme="light"] .heph-lockup') &&
        hephDemoStyles.includes("filter: brightness(0);") &&
        hephDemoStyles.includes(':root[data-theme="dark"] .heph-lockup') &&
        hephDemoStyles.includes("filter: none;"),
    "The Heph lockup must stay square, render below full width, and follow the active theme.",
);
assert(
    hephHtml.includes("const hephDemoForm = document.querySelector(") &&
        hephDemoStyles.includes(
            ".case-media .heph-demo {\n    margin-bottom: 0;",
        ),
    "The Heph case-study demo must reuse the live demo behavior without adding nested spacing.",
);
assert(
    portfolioStyles.includes(
        ".showcase {\n    display: grid;\n    grid-template-columns: 2.5fr 1fr;\n    gap: 20px;\n    margin-bottom: 32px;",
    ) &&
        portfolioStyles.includes(
            ".gallery {\n    display: grid;\n    grid-template-columns: repeat(2, 1fr);\n    gap: 20px;\n    margin-bottom: 32px;",
        ) &&
        !responsiveStyles.includes("margin-bottom: 80px;"),
    "Every homepage project transition must use the same optically compensated 32px rhythm at every viewport.",
);
assert(
    previewContentStyles.includes(
        ".site-footer {\n    margin-top: 0;",
    ) &&
        previewContentStyles.includes(
            ".references-links {\n    display: flex;\n    flex-direction: column;\n    row-gap: var(--section-content-gap);\n    margin-top: 0;",
        ) &&
        !previewContentStyles.includes(".copyright") &&
        previewContentStyles.includes(
            "@media (min-width: 769px) {\n    .site-footer {\n        margin-top: auto;",
        ) &&
        responsiveStyles.includes(
            ".site-footer {\n        display: none;",
        ),
    "The Metadata footer must remain desktop-only without copyright styling.",
);

assert(
    indexHtml.includes('href="/filen"'),
    "Homepage does not link to the Filen case study.",
);
assert(
    /<h1 class="name" id="site-title" itemprop="name">\s*<span data-nosnippet>Gil Rodrigues<\/span>\s*<\/h1>/.test(
        indexHtml,
    ),
    "The homepage name must remain plain text rather than linking to itself.",
);
assert(
    (indexHtml.match(/href="\/heph"/g) || []).length === 1 &&
        !indexHtml.includes('class="heph-demo-zoom-link"') &&
        !indexHtml.includes('href="https://github.com/gildrb/heph"'),
    "Homepage must link to the Heph case study exactly once through its card and never to the repository.",
);
assert(
    hephDemoStyles.includes(
            ".heph-demo-zoom-link:focus-visible,\n.heph-demo-close-link:focus-visible {\n    outline: 0;\n    box-shadow: 0 0 0 2px var(--text-primary);",
        ) &&
        hephDemoStyles.includes(
            ".case-media .heph-demo-zoom-link {\n    display: none;",
        ) &&
        !portfolioStyles.includes(
            ".heph-demo:has(.heph-demo-zoom-link:hover)",
        ) &&
        !portfolioStyles.includes(
            ".heph-demo:has(.heph-demo-zoom-link:focus-visible)",
        ),
    "The homepage green window control must remain a quiet navigation target without exposing the metadata read affordance.",
);
assert(
    /<a\s+class="heph-demo-close-link"\s+href="\/"\s+aria-label="Return to the portfolio"/.test(
        hephHtml,
    ) &&
        hephDemoStyles.includes(
            ".heph-demo-close-link {\n    left: 4px;\n    display: none;",
        ) &&
        hephDemoStyles.includes(
            ".case-media .heph-demo-close-link {\n    display: block;",
        ),
    "The Heph article must replace the homepage zoom interaction with a red window control that returns to the portfolio.",
);
assert(
    hephDemoStyles.includes(
        ".heph-demo-evidence-item:hover,\n    .heph-demo-evidence-item.is-active:hover,\n    .heph-demo-citation-button:hover {\n        color: var(--text-primary);",
    ),
    "Interactive evidence excerpts and citations must use the primary hover color, including the active right-side excerpt.",
);
assert(
    !hephDemoStyles.includes(".heph-demo-frame::after") &&
        !portfolioStyles.includes(".heph-demo-frame::after"),
    "The Heph demo must not use a hover or focus overlay.",
);
assert(
    (indexHtml.match(/href="\/filen"/g) || []).length === 1,
    "Only the featured Filen image may link to the case study.",
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
    (indexHtml.match(/href="\/curves"/g) || []).length === 1,
    "Homepage must link to the CURVES case study exactly once.",
);
assert(
    (indexHtml.match(/href="\/ben-davis"/g) || []).length === 1,
    "Homepage must link to the Ben Davis case study exactly once.",
);
assert(
    (indexHtml.match(/href="\/t3"/g) || []).length === 1,
    "Homepage must link to the T3 case study exactly once.",
);
assert(
    !indexHtml.includes("project-summary") &&
        !indexHtml.includes("Read the case study"),
    "Homepage Filen entry must remain image-led and concise.",
);
assert(
    hephHtml.includes('rel="canonical" href="https://gildrb.com/heph"') &&
        hephHtml.includes(
            '<a class="case-home-link" href="/">Gil Rodrigues</a>',
        ) &&
        hephHtml.includes('<a class="case-current-link" href="#top">Heph</a>') &&
        hephHtml.includes('href="https://github.com/gildrb/heph"') &&
        hephHtml.includes("GitHub repository") &&
        !hephHtml.includes("case-kicker"),
    "Heph must use the shared case-study shell and link to its repository inside the article.",
);
assert(
    /<a\s+class="internal-link"\s+href="\/heph">Heph<\/a> case study/.test(
        siteHtml,
    ),
    "Cross-study references must link readers directly to the referenced case study.",
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
        caseStyles.includes(".case-next-row + .case-next-row") &&
        caseStyles.includes("border-top:"),
    "Filen case study must keep the case table free of dot dividers and own row separators in case-next.",
);
assert(
    ml7Html.includes('rel="canonical" href="https://gildrb.com/ml7"') &&
        ml7Html.includes(
            '<a class="case-home-link" href="/">Gil Rodrigues</a>',
        ) &&
        ml7Html.includes('<a class="case-current-link" href="#top">mL7</a>') &&
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
        n0thingHtml.includes(
            '<a class="case-current-link" href="#top">n0thing</a>',
        ) &&
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
    curvesHtml.includes('rel="canonical" href="https://gildrb.com/curves"') &&
        curvesHtml.includes(
            '<a class="case-home-link" href="/">Gil Rodrigues</a>',
        ) &&
        curvesHtml.includes(
            '<a class="case-current-link" href="#top">CURVES</a>',
        ) &&
        !curvesHtml.includes('>Index</a>') &&
        !curvesHtml.includes("case-kicker"),
    "CURVES must use the same persistent case-study navigation as the existing projects.",
);
assert(
    !curvesHtml.includes("object-fit: cover") &&
        !curvesHtml.includes("object-position:") &&
        !curvesHtml.includes(" · "),
    "CURVES must preserve complete images and omit dot dividers.",
);
const curvesMediaSequence = [
    "gil-rodrigues-curves-letterforms-720.webp",
    "gil-rodrigues-curves-wordmark-720.webp",
    "gil-rodrigues-curves-uppercase-720.webp",
    "gil-rodrigues-curves-numerals-720.webp",
    "gil-rodrigues-curves-punctuation-720.webp",
    "gil-rodrigues-curves-specimen-720.webp",
];
assert(
    curvesMediaSequence.every((asset, index) => {
        const position = curvesHtml.indexOf(asset);
        const previousPosition =
            index === 0
                ? -1
                : curvesHtml.indexOf(curvesMediaSequence[index - 1]);
        return position > previousPosition;
    }),
    "CURVES media must follow the authored typeface sequence.",
);
assert(
    benDavisHtml.includes(
        'rel="canonical" href="https://gildrb.com/ben-davis"',
    ) &&
        benDavisHtml.includes(
            '<a class="case-home-link" href="/">Gil Rodrigues</a>',
        ) &&
        benDavisHtml.includes(
            '<a class="case-current-link" href="#top">Ben Davis</a>',
        ) &&
        !benDavisHtml.includes('>Index</a>') &&
        !benDavisHtml.includes("case-kicker"),
    "Ben Davis must use the same persistent case-study navigation as the existing projects.",
);
assert(
    !benDavisHtml.includes("object-fit: cover") &&
        !benDavisHtml.includes("object-position:") &&
        !benDavisHtml.includes(" · "),
    "Ben Davis must preserve complete images and omit dot dividers.",
);
const benDavisMediaSequence = [
    "gil-rodrigues-ben-davis-original.svg",
    "gil-rodrigues-ben-davis-brandmark.svg",
    "gil-rodrigues-ben-davis-construction-720.webp",
];
assert(
    benDavisMediaSequence.every((asset, index) => {
        const position = benDavisHtml.indexOf(asset);
        const previousPosition =
            index === 0
                ? -1
                : benDavisHtml.indexOf(benDavisMediaSequence[index - 1]);
        return position > previousPosition;
    }),
    "Ben Davis media must follow the authored brandmark sequence.",
);
assert(
    t3Html.includes('rel="canonical" href="https://gildrb.com/t3"') &&
        t3Html.includes(
            '<a class="case-home-link" href="/">Gil Rodrigues</a>',
        ) &&
        t3Html.includes('<a class="case-current-link" href="#top">T3</a>') &&
        !t3Html.includes('>Index</a>') &&
        !t3Html.includes("case-kicker"),
    "T3 must use the same persistent case-study navigation as the existing projects.",
);
assert(
    !t3Html.includes("object-fit: cover") &&
        !t3Html.includes("object-position:") &&
        !t3Html.includes(" · "),
    "T3 must preserve complete images and omit dot dividers.",
);
const t3MediaSequence = [
    "gil-rodrigues-t3-mark-720.webp",
    "gil-rodrigues-t3-canvas-overview-480.webp",
    "gil-rodrigues-t3-canvas-sketches-720.webp",
    "gil-rodrigues-t3-frame-grid-720.webp",
    "gil-rodrigues-t3-feedback-board-720.webp",
    "gil-rodrigues-t3-feedback-spacing-720.webp",
    "gil-rodrigues-t3-feedback-repainted-720.webp",
    "gil-rodrigues-t3-feedback-thinner-720.webp",
    "gil-rodrigues-t3-feedback-frames-720.webp",
    "gil-rodrigues-t3-feedback-angled-3-720.webp",
    "gil-rodrigues-t3-weight-tests-720.webp",
    "gil-rodrigues-t3-ghost-grid-720.webp",
    "gil-rodrigues-t3-canvas-color-720.webp",
    "gil-rodrigues-t3-color-tests-720.webp",
    "gil-rodrigues-t3-before-after-720.webp",
    "gil-rodrigues-t3-feedback-curves-720.webp",
    "gil-rodrigues-t3-system-board-720.webp",
    "gil-rodrigues-t3-product-board-720.webp",
    "gil-rodrigues-t3-brand-board-720.webp",
    "gil-rodrigues-t3-render-720.webp",
];
assert(
    t3MediaSequence.every((asset, index) => {
        const position = t3Html.indexOf(asset);
        const previousPosition =
            index === 0 ? -1 : t3Html.indexOf(t3MediaSequence[index - 1]);
        return position > previousPosition;
    }) &&
        t3Html.includes(
            'sizes="(max-width: 768px) calc(100vw - 24px), (max-width: 1100px) calc(50vw - 178px), 370px"',
        ),
    "T3 media must follow the authored sequence and use paired image layouts.",
);
const n0thingMediaSequence = [
    "gil-rodrigues-n0thing-typewriter-direction-720.webp",
    "gil-rodrigues-n0thing-pixel-variations-720.webp",
    "gil-rodrigues-n0thing-export-folder-720.webp",
    "gil-rodrigues-n0thing-wordmark-animation-720.gif",
];
assert(
    !n0thingHtml.includes("gil-rodrigues-n0thing-early-pixel-wordmark") &&
        !n0thingHtml.includes("The first direction") &&
        n0thingMediaSequence.every((asset, index) => {
            const position = n0thingHtml.indexOf(asset);
            const previousPosition =
                index === 0
                    ? -1
                    : n0thingHtml.indexOf(n0thingMediaSequence[index - 1]);
            return position > previousPosition;
        }),
    "n0thing media must follow the documented design process.",
);
const publicCopy = [
    ...allHtml,
    profileJson,
    ...identityTexts.map(({ text }) => text),
]
    .join("\n")
    .replace(/<[^>]+>/g, " ");
const publicCopyForStyleChecks = publicCopy.replace(
    /iteration\s+\u2014\s+not sold/g,
    "iteration not sold",
);
const stockAiPhrasePattern =
    /\b(?:delve|tapestry)\b|in today['’]s fast-paced world|crucial to note|ever-evolving landscape|certainly[!,].{0,20}here['’]s|sure[!,].{0,20}here['’]s|i['’]d be happy to/i;
const stockContrastPattern =
    /\bnot (?:just|only)\b[^.!?]{0,160}\bbut(?: also)?\b/i;
assert(
    !publicCopyForStyleChecks.includes("\u2014") &&
        !stockAiPhrasePattern.test(publicCopyForStyleChecks) &&
        !stockContrastPattern.test(publicCopyForStyleChecks),
    "Public copy and metadata must omit em dashes and stock AI phrasing.",
);
assert(
    allHtml.every(
        (html) =>
            !/\b(?:it|this|that|they|he|she)\s+(?:is|are|was|were|'s|’s)\s+not\b[^.!?]{0,160}[,;:]\s*(?:it|this|that|they|he|she)\s+(?:is|are|was|were|'s|’s)\b/i.test(
                html.replace(/<[^>]+>/g, " "),
            ),
    ),
    "Public copy must omit the forbidden negative-then-positive contrast structure.",
);
assert(
    allHtml.every(
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
        ".links-label {\n  color: var(--text-secondary);",
    ) &&
        baseStyles.includes(
            ".email {\n  font-size: 16px;\n  font-weight: 400;\n  line-height: var(--link-line-height);\n  color: var(--text-tertiary);",
        ),
    "Homepage labels and actionable links must preserve the semantic color hierarchy.",
);
assert(
    !portfolioOpen.includes("portfolio-label") &&
        portfolioOpen.includes('aria-label="Portfolio"'),
    "The portfolio section must retain an accessible name without a visible label.",
);
assert(
    responsiveStyles.includes(
        "body:not(.case-page) {\n    min-height: 100dvh;",
    ) &&
        responsiveStyles.includes(
            "body:not(.case-page) .layout {\n    min-height: 100dvh;",
        ) &&
        responsiveStyles.includes(
            "body:not(.case-page) .sidebar {\n    height: 100dvh;",
        ) &&
        responsiveStyles.includes(
            "body:not(.case-page) .content {\n    min-height: 100dvh;",
        ) &&
        responsiveStyles.includes(
            "html.homepage-scroll-locked,\nhtml.homepage-scroll-locked body {\n    height: 100dvh;\n}",
        ) &&
        responsiveStyles.includes(
            "html.homepage-scroll-locked body .layout {\n    height: 100dvh;\n    min-height: 100dvh;\n}",
        ) &&
        !responsiveStyles.includes("overscroll-behavior: none;"),
    "The homepage must use dynamic viewport sizing without suppressing native overscroll.",
);
assert(
    responsiveStyles.includes(
        "body:not(.case-page) {\n        min-height: 100svh;\n        height: auto;\n        overflow: visible;\n        overscroll-behavior: auto;",
    ) &&
        responsiveStyles.includes(
            "body:not(.case-page) .layout {\n        min-height: 100svh;\n        height: auto;\n        align-content: start;\n        overflow: visible;\n        overscroll-behavior: auto;",
        ) &&
        responsiveStyles.includes(
            "body:not(.case-page) .layout {\n        min-height: 100svh;\n        height: auto;\n        align-content: start;\n        overflow: visible;\n        overscroll-behavior: auto;\n        padding-bottom: 64px;",
        ) &&
        responsiveStyles.includes(
            "html.homepage-scroll-locked,\n    html.homepage-scroll-locked body {\n        height: 100dvh;\n        min-height: 100dvh;",
        ) &&
        !responsiveStyles.includes(
            "html.homepage-scroll-locked,\n    html.homepage-scroll-locked body {\n        height: 100dvh;\n        min-height: 100dvh;\n        overflow: hidden;",
        ) &&
        responsiveStyles.includes(
            "html.homepage-scroll-locked body .layout {\n        height: 100dvh;\n        min-height: 100dvh;\n        display: grid;\n        align-content: start;\n        grid-template-rows: auto auto minmax(0, 1fr) auto;\n        padding-bottom: 0;",
        ) &&
        responsiveStyles.includes(
            "body:not(.case-page) .name {\n        grid-column: 1;\n        order: 1;\n        position: relative;\n        z-index: 100;\n        width: calc(100% + 56px);\n        margin-left: -12px;\n        padding: 24px 44px 8px 12px;\n        background: var(--bg);",
        ) &&
        responsiveStyles.includes(
            "body.case-page .name {\n        grid-column: 1;\n        order: 1;\n        position: sticky;\n        top: 0;\n        z-index: 100;\n        width: calc(100% + 56px);\n        margin-left: -12px;\n        padding: 24px 44px 8px 12px;\n        background: linear-gradient(\n            to bottom,\n            var(--bg) 60%,\n            transparent\n        );",
        ) &&
        responsiveStyles.includes(
            "body:not(.case-page) .theme-toggle {\n        position: relative;\n        top: auto;",
        ) &&
        baseStyles.includes("--theme-toggle-optical-offset: 2px;") &&
        responsiveStyles.includes(
            "height: calc(24px + var(--link-line-height) + 8px);\n        min-height: var(--theme-toggle-size);\n        padding:\n            calc(24px + var(--theme-toggle-optical-offset)) 0\n            calc(8px - var(--theme-toggle-optical-offset));\n        align-items: center;",
        ) &&
        caseHtml.every((html) =>
            html.includes("--theme-toggle-optical-offset: 2px;"),
        ) &&
        baseStyles.includes("--text-media-gap: 32px;") &&
        previewContentStyles.includes(
            ".profile-summary {\n    max-width: 760px;\n    margin-bottom: var(--text-media-gap);",
        ) &&
        responsiveStyles.includes(
            ".portfolio-section {\n        order: 3;",
        ) &&
        responsiveStyles.includes(
            ".portfolio-section {\n        order: 3;\n        margin-bottom: var(--section-gap);",
        ) &&
        responsiveStyles.includes(
            ".links {\n        grid-column: 1 / -1;\n        order: 4;\n        margin-bottom: 0;",
        ) &&
        responsiveStyles.includes(
            ".links.mobile-links-grid {\n        display: grid;\n        grid-template-columns:\n            var(--mobile-contact-start) minmax(0, 1fr);\n        column-gap: 0;",
        ) &&
        responsiveStyles.includes(
            ".mobile-links-grid > .contact-label {\n        grid-column: 2;\n        grid-row: 1;\n        margin-top: 0;",
        ) &&
        responsiveStyles.includes(
            ".mobile-links-grid > .contact-label ~ .email {\n        grid-column: 2;\n        grid-row: 2;",
        ) &&
        responsiveStyles.includes(
            ".mobile-links-grid > .contact-label ~ .external-link {\n        grid-column: 2;\n        grid-row: 3;",
        ) &&
        responsiveStyles.includes(
            ".case-page .links.mobile-links-grid {\n        grid-template-columns: 3fr 4fr;",
        ) &&
        responsiveStyles.includes("row-gap: var(--section-content-gap);") &&
        responsiveStyles.includes(
            ".profile-summary {\n        grid-column: 1 / -1;\n        order: 2;\n        margin-bottom: var(--section-gap);",
        ) &&
        responsiveStyles.includes(
            ".portfolio-card-link {\n        padding: 7px 0;",
        ) &&
        siteScript.includes(
            "portfolioScope.getBoundingClientRect().left -",
        ) &&
        siteScript.includes(
            'links.style.setProperty(\n        "--mobile-contact-start",',
        ) &&
        siteScript.includes(
            'const mobileLinks = document.querySelector(\n    ".case-page .case-mobile-links .links, body:not(.case-page) .links",',
        ) &&
        siteScript.includes(
            'links.classList.add("mobile-links-grid");\n    if (!portfolioScope) return;',
        ) &&
        siteScript.includes(
            'window.addEventListener("resize", () => updateMobileLayout(true));',
        ) &&
        siteScript.includes("new ResizeObserver") &&
        siteScript.includes("mobileLayoutTargets.forEach") &&
        siteScript.includes(
            'let homepageLockState = "uninitialized";',
        ) &&
        siteScript.includes(
            'let homepageUnlockedHeight = 0;',
        ) &&
        siteScript.includes(
            'let homepageUnlockedContentBottom = 0;',
        ) &&
        siteScript.includes(
            'let homepageViewportWidth = window.innerWidth;',
        ) &&
        siteScript.includes(
            'function updateHomepageLock(preserveMobileState = false)',
        ) &&
        siteScript.includes(
            'preserveMobileState &&\n        isMobile &&\n        !viewportWidthChanged &&\n        homepageLockState === "locked"',
        ) &&
        siteScript.includes(
            'if (isMobile) {\n        root.classList.add("homepage-scroll-locked");\n        homepageLockState = "locked";',
        ) &&
        siteScript.includes(
            'root.classList.remove("homepage-scroll-locked");',
        ) &&
        siteScript.includes(
            'const isMobile = window.matchMedia("(max-width: 767px)").matches;',
        ) &&
        indexHtml.startsWith(
            '<!doctype html>\n<html lang="en" class="homepage-scroll-locked homepage-first-paint-pending">',
        ) &&
        siteScript.includes(
            "document.querySelectorAll(\n                \".profile-summary, .portfolio-section, .links, .site-footer\",",
        ) &&
        siteScript.includes(
            "const fits = contentBottom <= window.innerHeight;",
        ) &&
        siteScript.includes("const atTop = window.scrollY === 0;") &&
        siteScript.includes(
            "Math.abs(\n                window.innerHeight - homepageUnlockedHeight,\n            ) >= 32",
        ) &&
        siteScript.includes(
            "homepageUnlockedContentBottom - contentBottom >= 32",
        ) &&
        !siteScript.includes(
            "window.scrollTo(0, 0);\n        root.classList.add",
        ) &&
        siteScript.includes(
            'root.classList.add("homepage-scroll-locked");',
        ) &&
        siteScript.includes(
            'window.addEventListener("load", () => {\n    updateHomepageDates();\n    updateMobileLayout();\n});',
        ),
    "Mobile homepage sections must preserve the requested order and compact spacing.",
);
assert(
    indexHtml.includes('class="portfolio-table-header"') &&
        indexHtml.includes('aria-label="Project columns"') &&
        indexHtml.includes('data-sort-key="date"') &&
        indexHtml.includes('data-sort-key="title"') &&
        indexHtml.includes('data-sort-key="scope"') &&
        indexHtml.match(/class="portfolio-sort-indicator"/g)?.length === 3 &&
        indexHtml.includes('aria-hidden="true"') &&
        indexHtml.includes(">\n                                Date\n") &&
        indexHtml.includes(">\n                                Project\n") &&
        indexHtml.includes(">\n                                Scope\n") &&
        indexHtml.includes(
            'class="portfolio-link-heading"\n                                href="/all?sort=date&direction=descending"\n                            >All</a>',
        ) &&
        indexHtml.indexOf('class="portfolio-table-header"') <
            indexHtml.indexOf('class="portfolio-list"') &&
        portfolioStyles.includes(
            ".portfolio-table-header {\n    display: grid;\n    grid-column: 1 / -1;\n    grid-template-columns: subgrid;",
        ) &&
        portfolioStyles.includes(
            'font-family: "Inter", sans-serif;\n    font-size: 16px;\n    font-weight: 400;\n    line-height: 24px;',
        ) &&
        portfolioStyles.includes(
            ".portfolio-sort-date {\n    grid-column: 1;",
        ) &&
        portfolioStyles.includes(
            ".portfolio-sort-title {\n    grid-column: 2;",
        ) &&
        portfolioStyles.includes(
            ".portfolio-sort-scope {\n    grid-column: 3;",
        ) &&
        portfolioStyles.includes(
            ".portfolio-sort-indicator {\n    visibility: hidden;\n    font-family: \"Inter\", sans-serif;",
        ) &&
        portfolioStyles.includes(
            ".portfolio-sort-button[data-sort-direction]\n    .portfolio-sort-indicator {\n    visibility: visible;",
        ) &&
        portfolioStyles.includes(
            ".portfolio-link-heading {\n    grid-column: 4;",
        ) &&
        portfolioStyles.includes(
            "@media (min-width: 768px) {\n    .portfolio-table-header {\n        padding-top: 0;",
        ) &&
        !portfolioStyles.includes(".portfolio-sort-button:hover") &&
        !portfolioStyles.includes("text-decoration: underline") &&
        siteScript.includes('".portfolio-sort-button"') &&
        siteScript.includes('document.querySelector(".portfolio-list")') &&
        siteScript.includes("titleCollator.compare(leftValue, rightValue)") &&
        siteScript.includes('querySelector(`.portfolio-card-${key}`)') &&
        siteScript.includes('getAttribute("datetime")') &&
        siteScript.includes("leftValue.localeCompare(rightValue)") &&
        siteScript.includes(
            'function getSortDirectionFactor(key, direction)',
        ) &&
        siteScript.includes('return isDescending ? -1 : 1;') &&
        siteScript.includes('return isDescending ? 1 : -1;') &&
        siteScript.includes('key !== "scope"') &&
        siteScript.includes(
            'titleCollator.compare(leftTitle, rightTitle)',
        ) &&
        siteScript.includes('direction = "descending";') &&
        siteScript.includes(
            'direction === "ascending" ? "↑" : "↓"',
        ) &&
        siteScript.includes(
            'return direction === "descending" ? "A to Z" : "Z to A";',
        ) &&
        siteScript.includes(
            "rows.forEach((row) => portfolioList.append(row));",
        ) &&
        siteScript.includes(
            "portfolioAllLink.href = `/all?sort=${key}&direction=${direction}`;",
        ) &&
        baseStyles.includes("--case-title-text-gap: 24px;") &&
        baseStyles.includes(
            "--all-case-gap: calc(var(--case-title-text-gap) * 1.618);",
        ) &&
        caseStyles.includes(
            ".all-case + .all-case {\n    margin-top: var(--all-case-gap);",
        ) &&
        allPage.includes('class="all-cases"') &&
        (allPage.match(/class="all-case"/g) || []).length === 8 &&
        allPage.includes('data-date="2026-07-15" data-scope="Design Engineering" data-slug="site" data-title="gildrb.com"') &&
        allPage.lastIndexOf('data-slug="site"') >
            allPage.indexOf('data-slug="ml7"') &&
        allScript.includes('new URLSearchParams(window.location.search)') &&
        !allScript.includes('left.dataset.slug === "site"') &&
        !allScript.includes('right.dataset.slug === "site"') &&
        allScript.includes(
            'allSortKey === "date"\n            ? isDescending',
        ) &&
        allScript.includes('allSortKey !== "scope"') &&
        allScript.includes("left.dataset.title") &&
        allScript.includes("right.dataset.title") &&
        allScript.includes('cases.forEach((caseStudy) => allCases.append(caseStudy));') &&
        siteScript.includes(
            "announce(`Projects sorted by ${key}, ${description}.`)",
        ) &&
        siteScript.includes('"A to Z"') &&
        siteScript.includes('"Z to A"') &&
        siteScript.includes("if (event.detail !== 0) button.blur();") &&
        !caseScript.includes("portfolioSortButtons"),
    "The homepage must use secondary-tone Date, Project, Scope, and All headings, with All preserving the active sort for the continuous projects page.",
);
assert(
    portfolioOpen.indexOf('class="portfolio-table-header"') <
        portfolioOpen.indexOf('class="portfolio-section"') &&
        responsiveStyles.includes(
            "html.homepage-scroll-locked body .portfolio-scroll-frame {\n        grid-row: 3;\n        grid-template-rows: auto minmax(0, 1fr);",
        ) &&
        responsiveStyles.includes(
            "html.homepage-scroll-locked body .portfolio-section {\n        grid-row: 2;\n        height: auto;",
        ) &&
        responsiveStyles.includes(
            "html.homepage-scroll-locked body .portfolio-section {\n        grid-row: 2;\n        height: auto;\n        min-height: 0;\n        margin-bottom: 0;\n        align-content: start;\n        overflow-y: auto;\n        overscroll-behavior: auto;",
        ) &&
        responsiveStyles.includes(
            "html.homepage-scroll-locked body .portfolio-table-header {\n        grid-row: 1;\n        position: relative;",
        ),
    "The locked mobile homepage must keep the filter row outside the scrolling table and preserve native overscroll.",
);
const portfolioDates = [
    ["2026-07-25", "2026-07-25", "T3"],
    ["2026-07-07", "2026-07-07", "Ben Davis"],
    ["2026-04-21", "2026-04-21", "Heph"],
    ["2026-01-14", "2026-01-14", "Filen"],
    ["2019-11-15", "2019-11-15", "n0thing"],
    ["2019-01-25", "2019-01-25", "CURVES"],
    ["2018-11-13", "2018-11-13", "mL7"],
];
assert(
    portfolioDates.every(
        ([datetime, date, title]) =>
            indexHtml.includes(`<time datetime="${datetime}">`) &&
            indexHtml.includes(
                `<span class="portfolio-date-full">${date}</span>`,
            ) &&
            indexHtml.includes(
                `<span class="portfolio-date-year">${date.slice(0, 4)}</span>`,
            ) &&
            indexHtml.includes(`>${title}</span`),
    ) &&
        portfolioStyles.includes(
            ".portfolio-section {\n    display: grid;\n    grid-template-columns: max-content max-content minmax(0, 1fr) auto;\n    column-gap: 16px;\n    container-type: inline-size;",
        ) &&
        portfolioStyles.includes(
            ".portfolio-list {\n    display: grid;\n    grid-column: 1 / -1;\n    grid-template-columns: subgrid;\n    margin-top: 0;",
        ) &&
        portfolioStyles.includes(
            ".portfolio-card-link {\n    display: grid;\n    grid-column: 1 / -1;\n    grid-template-columns: subgrid;",
        ) &&
        portfolioStyles.includes("width: 100%;") &&
        !portfolioStyles.includes("width: calc(100% + 20px);") &&
        !portfolioStyles.includes("margin-inline: -10px;") &&
        portfolioStyles.includes(
            ".portfolio-card-title {\n    grid-column: 2;\n    grid-row: 1;\n    white-space: nowrap;\n    color: var(--text-primary);\n    font-size: 16px;\n    font-weight: 400;\n    line-height: 24px;",
        ) &&
        portfolioStyles.includes(
            ".portfolio-card-scope {\n    grid-column: 3;\n    grid-row: 1;\n    min-width: 0;\n    overflow: hidden;\n    white-space: nowrap;\n    text-overflow: ellipsis;\n    color: var(--text-tertiary);\n    font-size: 16px;\n    font-weight: 400;\n    line-height: 24px;",
        ) &&
        portfolioStyles.includes(
            ".portfolio-card-link {\n    display: grid;\n    grid-column: 1 / -1;\n    grid-template-columns: subgrid;\n    align-items: baseline;\n    width: 100%;\n    padding: 8px 0;\n    color: var(--text-tertiary);",
        ) &&
        !portfolioStyles.includes(
            ".portfolio-card-link time {\n    grid-column: 1;\n    grid-row: 1;\n    display: block;\n    color: var(--text-tertiary);\n    font-size: 16px;\n    line-height: 24px;",
        ) &&
        portfolioStyles.includes(
            ".portfolio-card-link time {\n    grid-column: 1;\n    grid-row: 1;\n    display: block;\n    white-space: nowrap;\n    color: inherit;\n    font-size: 16px;\n    line-height: 24px;",
        ) &&
        portfolioStyles.includes(
            ".portfolio-card-arrow {\n    grid-column: 4;\n    grid-row: 1;\n    align-self: baseline;\n    display: inline-flex;",
        ) &&
        portfolioStyles.includes(
            ".portfolio-card-view {\n    visibility: hidden;",
        ) &&
        portfolioStyles.includes('font-family: "Inter", sans-serif;') &&
        !portfolioStyles.includes(".portfolio-card-arrow svg") &&
        !portfolioStyles.includes(".portfolio-card-link::after") &&
        (indexHtml.match(/class="portfolio-card-arrow"/g) || []).length === 8 &&
        (indexHtml.match(/class="portfolio-card-scope">Brand Identity/g) || [])
            .length === 1 &&
        (indexHtml.match(/class="portfolio-card-scope">Wordmark/g) || [])
            .length === 2 &&
        (indexHtml.match(/class="portfolio-card-scope">Typeface/g) || [])
            .length === 1 &&
        (indexHtml.match(/class="portfolio-card-scope">Logomark/g) || [])
            .length === 2 &&
        (indexHtml.match(/class="portfolio-card-scope">Product\/Design Engineering/g) || [])
            .length === 1 &&
        (indexHtml.match(/class="portfolio-card-scope">Design Engineering/g) || [])
            .length === 1 &&
        (indexHtml.match(/class="portfolio-card-view">View<\/span>/g) || [])
            .length === 8 &&
        (indexHtml.match(/<span class="portfolio-card-view">View<\/span>\s+→/g) || [])
            .length === 8 &&
        portfolioStyles.includes(
            ".portfolio-card-link + .portfolio-card-link {\n    margin-top: 0;\n    border-top: 1px solid\n        color-mix(in srgb, var(--text-primary) 12%, transparent);",
        ) &&
        portfolioStyles.includes(
            "@media (max-width: 767px) {\n    .portfolio-section {\n        grid-template-columns: max-content max-content minmax(0, 1fr) auto;\n        column-gap: clamp(8px, 3vw, 16px);",
        ) &&
        portfolioStyles.includes(
            ".portfolio-card-view {\n        display: none;",
        ) &&
        portfolioStyles.includes(
            ".portfolio-date-full {\n        display: none;",
        ) &&
        portfolioStyles.includes(
            ".portfolio-date-year {\n        display: inline;",
        ) &&
        portfolioStyles.includes(
            "@container (max-width: 400px) {\n    .portfolio-date-full {\n        display: none;",
        ) &&
        !portfolioStyles.includes("@media (max-width: 360px)"),
    "Homepage projects must expose single-line rows with aligned ISO dates, space-preserving years, titles, ellipsized field tags, native Inter arrows, hover View labels, and faint separators.",
);
assert(
    indexHtml.includes(
        '<time id="portfolio-site-date" datetime="2026-07-15">',
    ) &&
        siteScript.includes(
            'document.querySelector("#portfolio-site-date")',
        ) &&
        siteScript.includes("const now = new Date();") &&
        siteScript.includes(
            'portfolioSiteDate.querySelector(".portfolio-date-full").textContent',
        ) &&
        siteScript.includes(
            'portfolioSiteDate.querySelector(".portfolio-date-year").textContent',
        ) &&
        siteScript.includes(
            'portfolioSiteDate.setAttribute("datetime", isoDate);',
        ),
    "The site card must expose a fallback date and update it to the visitor's current local date.",
);
assert(
    siteScript.includes("function updateHomepageDates()") &&
        !siteScript.includes("copyrightYear") &&
        siteScript.includes(
            'window.addEventListener("load", () => {\n    updateHomepageDates();\n    updateMobileLayout();\n});',
        ),
    "Homepage date updates must not retain removed copyright behavior.",
);
assert(
    portfolioStyles.includes(
        ".portfolio-card-link:focus-visible {\n    color: var(--text-primary);\n    outline: 1px solid var(--text-primary);\n    outline-offset: 6px;",
    ) &&
        (await readText("src/styles/30-heph-demo.css")).includes(
            "margin-bottom: 32px;\n    overflow: visible;",
        ),
    "Heph metadata focus must use the shared offset ring without an ancestor clipping it.",
);
assert(
    baseStyles.includes(
        ".name {\n  font-size: 19px;\n  font-weight: 400;\n  line-height: var(--link-line-height);\n  letter-spacing: -0.02em;\n  color: var(--text-primary);\n  min-height: calc(var(--link-line-height) * 2);\n  margin-bottom: calc(var(--section-gap) + var(--section-content-gap) + var(--text-media-gap) - var(--link-line-height));",
    ),
    "The sidebar Links block must align with the homepage column header through token-based name spacing.",
);
const chronologicalProjectTitles = [
    "portfolio-site-title",
    "portfolio-t3-title",
    "portfolio-ben-davis-title",
    "portfolio-heph-title",
    "portfolio-filen-title",
    "portfolio-n0thing-title",
    "portfolio-curves-title",
    "portfolio-ml7-title",
];
assert(
    chronologicalProjectTitles
        .map((id) => indexHtml.indexOf(`id="${id}"`))
        .every((position, index, positions) =>
            index === 0 ? position !== -1 : position > positions[index - 1],
        ),
    "Homepage projects must default to one global newest-first order: gildrb.com, Heph, Filen, n0thing, mL7.",
);
assert(
    indexHtml.includes('class="portfolio-list"') &&
        !indexHtml.includes("portfolio-group-engineering-title") &&
        !indexHtml.includes("portfolio-group-design-title") &&
        !portfolioStyles.includes(".portfolio-group") &&
        (indexHtml.match(/class="portfolio-card-link"/g) || []).length === 8,
    "Homepage projects must live in one globally sortable list without category dividers.",
);
assert(
    !indexHtml.includes("<img") &&
        !indexHtml.includes('class="portfolio-card-image"') &&
        !indexHtml.includes('class="showcase') &&
        !indexHtml.includes('class="gallery'),
    "The homepage must present projects as text-only date/title cards without media.",
);
assert(
    caseStyles.includes(
        ".case-deck {\n    max-width: 680px;\n    color: var(--text-secondary);",
    ) &&
        caseStyles.includes(
            ".case-copy p,\n.case-copy li {\n    color: var(--text-secondary);",
        ) &&
        caseStyles.includes(
            ".case-meta dt,\n.case-caption,\n.case-code-label {\n    color: var(--text-tertiary);",
        ),
    "Case-study prose and media captions must preserve the brighter-gray/darker-gray hierarchy.",
);
assert(
    caseStyles.includes(
        ".case-title {\n    max-width: 760px;\n    margin: 0 0 var(--case-title-text-gap);\n    font-size: 28px;\n    font-weight: 500;\n    line-height: 36px;\n    letter-spacing: -0.02em;",
    ) &&
        caseStyles.includes(
            ".case-copy h2 {\n    margin-bottom: 24px;\n    font-size: 24px;\n    font-weight: 500;\n    line-height: 32px;",
        ) &&
        caseStyles.includes(
            ".case-copy h3 {\n    margin: 48px 0 12px;\n    font-size: 19px;\n    font-weight: 500;\n    line-height: 28px;",
        ) &&
        caseStyles.includes(
            ".case-title {\n        font-size: 24px;\n        line-height: 32px;",
        ),
    "Case-study headings must use the calm 19/24/28px hierarchy, tighten the page title, and align it to the article top.",
);
assert(
    caseStyles.includes(
        ".case-article article {\n    width: min(100%, 760px);\n    margin-right: auto;\n    margin-left: auto;",
    ),
    "Case articles and their media must stay inside the centered blog-width boundary.",
);
assert(
    baseStyles.includes("--sidebar-column: 240px;") &&
        baseStyles.includes("--content-column: 760px;") &&
        baseStyles.includes(
            "max-width: calc(var(--sidebar-column) + var(--layout-gap) + var(--content-column));\n  margin: 0 auto;",
        ) &&
        baseStyles.includes(
            ".content {\n  min-width: 0;\n  width: 100%;\n  max-width: var(--content-column);\n  padding: 48px 0;",
        ),
    "Homepage and case-study content must share the centered 760px column and align with the 48px desktop sidebar inset.",
);
assert(
    caseStyles.includes(
        ".case-location .case-home-link,\n.case-arrow {\n    color: var(--text-tertiary);",
        ) &&
        caseStyles.includes(
            ".case-location .case-current-link {\n    color: var(--text-primary);",
        ) &&
        caseStyles.includes(
            ".case-location .case-home-link:hover {\n        color: var(--text-primary);",
        ),
    "Case locations must preserve the active-page hierarchy.",
);
assert(
    caseStyles.includes(
        ".case-location {\n    display: flex;\n    flex-wrap: wrap;\n    column-gap: 8px;\n    row-gap: 0;",
    ) &&
        caseStyles.includes(
            ".case-home-link {\n    flex-basis: 100%;",
        ),
    "Case locations must place the project arrow and name on a second line.",
);
assert(
    baseStyles.includes(
        "line-height: var(--link-line-height);\n  letter-spacing: -0.02em;\n  color: var(--text-primary);\n  min-height: calc(var(--link-line-height) * 2);",
    ) &&
        previewContentStyles.includes(
            ".profile-copy {\n    font-size: 16px;\n    font-weight: 400;\n    color: var(--text-primary);",
        ),
    "Desktop sidebar locations must reserve two lines and homepage biography must use primary text.",
);
assert(
    caseStyles.includes(
        ".case-intro,\n.case-copy {\n    width: min(100%, 760px);\n    margin-right: auto;\n    margin-left: auto;",
    ),
    "Case intro and prose columns must be centered inside the wider media container.",
);
assert(
    responsiveStyles.includes(
        "@media (min-width: 769px) and (max-height: 720px)",
    ) &&
        responsiveStyles.includes(
            ".theme-toggle {\n        grid-column: 2;\n        grid-row: 1;\n        align-self: start;\n        justify-self: end;\n        margin-top: 0;\n        margin-bottom: 0;",
        ),
    "Short desktop windows must not let the theme toggle footer margin stretch the location row.",
);
assert(
    caseStyles.includes("@media (min-width: 769px)") &&
        caseStyles.includes(
            ".case-article article > :last-child {\n        --case-final-line-height: 24px;\n        padding-bottom: calc(\n            var(--footer-title-center-offset) +",
        ) &&
        caseStyles.includes(
            ".case-section:last-child .case-copy:last-child h2:last-child {\n        margin-bottom: 0;",
        ) &&
        !caseStyles.includes("margin-top: auto;") &&
        !caseStyles.includes("padding-top: 80px;"),
    "Desktop case endings must keep their natural flow while reserving the theme toggle's bottom boundary.",
);
assert(
    caseStyles.includes(
        ".case-article article:has(+ .case-next) > :last-child {\n        padding-bottom: 0;",
    ) &&
        caseStyles.includes(
            ".case-next {\n    width: min(100%, 760px);\n    margin: 48px auto 0;",
        ) &&
        caseStyles.includes(
            "padding: 8px 0;",
        ) &&
        caseStyles.includes(
            "@media (max-width: 768px)",
        ),
    "Case-next pages must keep the article gap and table rows on the documented spacing scale.",
);
assert(
    caseStyles.includes(
        ".case-media {\n    width: 100%;\n    margin-top: var(--text-media-gap);",
    ) &&
        caseStyles.includes(
            ".case-media-grid {\n    display: grid;",
        ) &&
        caseStyles.includes(
            ".case-media + .case-copy,\n.case-media-grid + .case-copy {\n    margin-top: var(--text-media-gap);",
        ) &&
        !caseStyles.includes("padding-top: var(--text-media-gap);"),
    "Case media must use the shared optical text-media gap before and after each figure.",
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
    allHtml.every(
        (html) =>
            sharedSidebarTargets.every((target) => html.includes(target)) &&
            html.includes('aria-label="Copy hi@gildrb.com"') &&
            html.includes('aria-label="Public profiles and contact"'),
    ),
    "Every generated route must contain the shared profile and contact sidebar.",
);
assert(
    siteScript.includes('window.history.scrollRestoration = "manual";') &&
        siteScript.includes('window.addEventListener("pagehide", saveScrollPosition);') &&
        siteScript.includes('window.addEventListener("pageshow", restoreScrollPosition);') &&
        caseScript.includes('window.addEventListener("pagehide", saveScrollPosition);') &&
        caseScript.includes('window.addEventListener("pageshow", restoreScrollPosition);'),
    "Homepage and case routes must preserve per-tab scroll positions across back/forward navigation.",
);
assert(
    caseHtml.every(
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
