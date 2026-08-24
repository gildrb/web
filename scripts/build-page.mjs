import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { renderCaseMarkdown } from "./render-case-markdown.mjs";
import { siteConfig, sitePaths } from "./site-config.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, sitePaths.output);
const staticSource = sitePaths.staticSource;
const contentSource = sitePaths.contentSource;

async function readText(relativePath) {
    return readFile(path.join(root, relativePath), "utf8");
}

async function readBundle(relativeDir, files) {
    return (
        await Promise.all(
            files.map((file) => readText(`${relativeDir}/${file}`)),
        )
    )
        .map((text) => text.trimEnd())
        .join("\n\n");
}

function indentBlock(text, spaces) {
    const prefix = " ".repeat(spaces);

    return text
        .trimEnd()
        .split("\n")
        .map((line) => `${prefix}${line}`)
        .join("\n");
}

function replaceToken(template, token, value) {
    if (!template.includes(token)) {
        throw new Error(`Missing template token: ${token}`);
    }

    return template.replace(token, value);
}

async function resolveIncludes(template) {
    const includePattern = /<!-- @include:([^>]+) -->/;
    let html = template.replace(
        /\n?<!-- @template-only:start -->[\s\S]*?<!-- @template-only:end -->\n?/g,
        "\n",
    );
    let includeCount = 0;

    while (html.includes("<!-- @include:")) {
        const match = html.match(includePattern);

        if (!match) {
            break;
        }

        includeCount += 1;
        if (includeCount > 100) {
            throw new Error("Too many nested includes; check for an include cycle.");
        }

        const includePath = match[1].trim();
        const include = (await readText(`src/${includePath}`)).trimEnd();

        html = html.replace(match[0], include);
    }

    if (html.includes("<!-- @include:")) {
        throw new Error("Generated HTML still contains include tokens.");
    }

    return html;
}

function extractHomepageUpdatedDate(homepageMarkdown) {
    return (
        homepageMarkdown.match(/^Last updated:\s*(.+)$/m)?.[1]?.trim() ??
        new Date().toISOString().slice(0, 10)
    );
}

async function buildFullSiteText() {
    const homepageMarkdown = await readText(`${staticSource}/index.html.md`);
    const lastUpdated = extractHomepageUpdatedDate(homepageMarkdown);
    const caseMarkdown = await Promise.all(
        siteConfig.caseStudies.map(async ({ slug, title }) => ({
            markdown: await readText(`${contentSource}/${slug}.md`),
            slug,
            title,
        })),
    );
    const pages = [
        "- [Homepage](https://gildrb.com/index.html.md)",
        ...caseMarkdown.map(
            ({ slug, title }) =>
                `- [${title}](https://gildrb.com/${slug}) ([Markdown source](https://gildrb.com/content/${slug}.md))`,
        ),
    ].join("\n");
    const sections = [
        [
            "## Homepage",
            "",
            "Canonical page: https://gildrb.com/",
            "Markdown source: https://gildrb.com/index.html.md",
            "",
            homepageMarkdown.trim(),
        ].join("\n"),
        ...caseMarkdown.map(({ markdown, slug, title }) =>
            [
                `## Case Study: ${title}`,
                "",
                `Canonical page: https://gildrb.com/${slug}`,
                `Markdown source: https://gildrb.com/content/${slug}.md`,
                "",
                markdown.trim(),
            ].join("\n"),
        ),
    ].join("\n\n---\n\n");

    return `${[
        "# Full Public Text for gildrb.com",
        "",
        "> Single-file Markdown export of the public website text for Gil Rodrigues, also known as gildrb.",
        "",
        `Last updated: ${lastUpdated}`,
        "Canonical: [https://gildrb.com/llms-full.txt](https://gildrb.com/llms-full.txt)",
        "Homepage: [https://gildrb.com/](https://gildrb.com/)",
        "LLM reference: [https://gildrb.com/llms.txt](https://gildrb.com/llms.txt)",
        "",
        "This file is generated from the same authored Markdown sources as the website. It exists so search agents, language models, and crawlers can retrieve the complete public text of the site from one URL without needing recursive crawling.",
        "",
        "## Pages Included",
        "",
        pages,
        "",
        "---",
        "",
        sections,
    ].join("\n")}\n`;
}

export async function buildPage({ write = true } = {}) {
    const profile = JSON.parse(await readText(siteConfig.profileSource));
    const profileJson = `${JSON.stringify(profile, null, 2)}\n`;
    const fullSiteText = await buildFullSiteText();
    const homepageStyles = await readBundle(
        "src/styles",
        siteConfig.homepage.styles,
    );
    const siteScript = await readBundle(
        "src/scripts",
        siteConfig.homepage.scripts,
    );
    const styleBundles = new Map();
    const scriptBundles = new Map();

    for (const { scripts, styles } of siteConfig.caseStudies) {
        const styleBundleKey = styles.join("\0");
        const bundleKey = scripts.join("\0");

        if (!styleBundles.has(styleBundleKey)) {
            styleBundles.set(
                styleBundleKey,
                await readBundle("src/styles", styles),
            );
        }

        if (!scriptBundles.has(bundleKey)) {
            scriptBundles.set(
                bundleKey,
                await readBundle("src/scripts", scripts),
            );
        }
    }

    const caseStyles = Object.fromEntries(
        siteConfig.caseStudies.map(({ slug, styles }) => [
            slug,
            styleBundles.get(styles.join("\0")),
        ]),
    );
    const caseScripts = Object.fromEntries(
        siteConfig.caseStudies.map(({ scripts, slug }) => [
            slug,
            scriptBundles.get(scripts.join("\0")),
        ]),
    );

    let indexHtml = await resolveIncludes(
        await readText("src/page.template.html"),
    );
    indexHtml = replaceToken(
        indexHtml,
        "<!-- @inline-json:profile-schema -->",
        indentBlock(profileJson, 12),
    );
    indexHtml = replaceToken(
        indexHtml,
        "<!-- @inline-css:site -->",
        homepageStyles,
    );
    indexHtml = replaceToken(
        indexHtml,
        "<!-- @inline-js:site -->",
        siteScript,
    );

    if (indexHtml.includes("<!-- @inline-")) {
        throw new Error("Generated HTML still contains inline tokens.");
    }
    indexHtml = indexHtml.replaceAll(
        "<script>",
        '<script data-cfasync="false">',
    );
    const portfolioCases = [
        ...indexHtml.matchAll(
            /<a\s+class="portfolio-card-link"\s+href="\/([^"?]+)"[\s\S]*?<time[^>]+datetime="([^"]+)"[\s\S]*?<h3\s+class="portfolio-card-title"[^>]*>([^<]+)<\/h3\s*>[\s\S]*?<span\s+class="portfolio-card-scope">([^<]+)<\/span>/g,
        ),
    ].map(([, slug, date, title, scope]) => ({
        date,
        scope,
        slug,
        title,
    }));
    if (portfolioCases.length !== siteConfig.caseStudies.length) {
        throw new Error("Could not derive every all-projects entry from the homepage.");
    }

    function renderCaseSuggestions(slug) {
        return [
            `                    <nav class="case-next" aria-label="All projects">`,
            '                        <h2 class="case-next-heading">View next</h2>',
            '                        <div class="case-next-list">',
            ...portfolioCases.flatMap(
                ({ date, scope, slug: suggestionSlug, title }) => {
                    if (suggestionSlug === slug) {
                        return [];
                    }
                    const rowStart = `                            <a class="case-next-row case-next-link" href="/${suggestionSlug}">`;
                    return [
                        rowStart,
                        `                                <time datetime="${date}">`,
                        `                                    <span class="case-next-date-full">${date}</span>`,
                        `                                    <span class="case-next-date-year">${date.slice(0, 7)}</span>`,
                        "                                </time>",
                        `                                <span class="case-next-project">${title}</span>`,
                        `                                <span class="case-next-scope">${scope}</span>`,
                        '                                <span class="case-next-arrow" aria-hidden="true">',
                        '                                    <span class="case-next-view">View</span>',
                        '                                    →',
                        "                                </span>",
                        "                            </a>",
                    ];
                },
            ),
            '                        </div>',
            '                    </nav>',
        ].join("\n");
    }

    async function buildCasePage({ slug }) {
        const templatePath = `src/${slug}.template.html`;
        let html = await resolveIncludes(await readText(templatePath));
        html = replaceToken(
            html,
            `<!-- @case-markdown:${slug} -->`,
            indentBlock(
                await renderCaseMarkdown({ root, slug, resolveIncludes }),
                24,
            ),
        );
        html = replaceToken(
            html,
            "<!-- @case-next -->",
            renderCaseSuggestions(slug),
        );
        html = replaceToken(
            html,
            "<!-- @inline-css:site -->",
            caseStyles[slug],
        );
        html = replaceToken(
            html,
            "<!-- @inline-js:case -->",
            caseScripts[slug],
        );

        if (html.includes("<!-- @inline-")) {
            throw new Error(
                `Generated ${templatePath} still contains inline tokens.`,
            );
        }

        return html.replaceAll("<script>", '<script data-cfasync="false">');
    }

    const casePages = Object.fromEntries(
        await Promise.all(
            siteConfig.caseStudies.map(async (caseStudy) => [
                caseStudy.slug,
                await buildCasePage(caseStudy),
            ]),
        ),
    );
    const allStyles = await readBundle("src/styles", siteConfig.allPage.styles);
    const allScript = await readBundle("src/scripts", siteConfig.allPage.scripts);
    let allPage = await resolveIncludes(await readText("src/all.template.html"));
    const allCases = await Promise.all(
        portfolioCases
            .sort((left, right) => {
                if (left.slug === "site") return 1;
                if (right.slug === "site") return -1;
                return right.date.localeCompare(left.date);
            })
            .map(async ({ date, scope, slug, title }) =>
                [
                    `                        <article class="all-case" data-date="${date}" data-scope="${scope}" data-slug="${slug}" data-title="${title}">`,
                    indentBlock(
                        await renderCaseMarkdown({ root, slug, resolveIncludes }),
                        28,
                    ).replace(/[ \t]+$/gm, ""),
                    "                        </article>",
                ].join("\n"),
            ),
    );
    allPage = replaceToken(
        allPage,
        "<!-- @all-cases -->",
        allCases.join("\n"),
    );
    allPage = replaceToken(allPage, "<!-- @inline-css:all -->", allStyles);
    allPage = replaceToken(allPage, "<!-- @inline-js:all -->", allScript);

    if (allPage.includes("<!-- @inline-") || allPage.includes("<!-- @all-")) {
        throw new Error("Generated all-projects page still contains build tokens.");
    }
    allPage = allPage.replaceAll("<script>", '<script data-cfasync="false">');

    if (write) {
        await rm(output, { recursive: true, force: true });
        await mkdir(output, { recursive: true });
        await cp(path.join(root, staticSource), output, { recursive: true });
        await cp(
            path.join(root, contentSource),
            path.join(output, "content"),
            { recursive: true },
        );
        await writeFile(path.join(output, "index.html"), indexHtml);
        await writeFile(path.join(output, "llms-full.txt"), fullSiteText);
        await writeFile(path.join(output, "profile.json"), profileJson);
        await mkdir(path.join(output, "all"), { recursive: true });
        await writeFile(path.join(output, "all", "index.html"), allPage);

        await Promise.all(
            Object.entries(casePages).map(async ([slug, html]) => {
                await mkdir(path.join(output, slug), { recursive: true });
                await writeFile(path.join(output, slug, "index.html"), html);
            }),
        );
    }

    return {
        allPage,
        allScript,
        casePages,
        caseScripts,
        caseStyles,
        allStyles,
        homepageStyles,
        indexHtml,
        fullSiteText,
        profileJson,
        siteScript,
    };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    await buildPage();
}
