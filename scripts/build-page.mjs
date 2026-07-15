import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { renderCaseMarkdown } from "./render-case-markdown.mjs";
import { siteConfig } from "./site-config.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function readText(relativePath) {
    return readFile(path.join(root, relativePath), "utf8");
}

async function readSortedFiles(relativeDir, predicate = () => true) {
    const dir = path.join(root, relativeDir);
    const entries = await readdir(dir);
    const files = entries.filter(predicate).sort();

    return Promise.all(
        files.map(async (file) => ({
            file,
            text: (await readFile(path.join(dir, file), "utf8")).trimEnd(),
        })),
    );
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

export async function buildPage({ write = true } = {}) {
    const profile = JSON.parse(await readText(siteConfig.profileSource));
    const profileJson = `${JSON.stringify(profile, null, 2)}\n`;
    const styles = (await readSortedFiles("src/styles", (file) =>
        file.endsWith(".css"),
    ))
        .map(({ text }) => text)
        .join("\n\n");
    const analyticsBootstrap = (
        await readText(`src/scripts/${siteConfig.analyticsScript}`)
    ).trimEnd();
    const siteScript = (
        await readSortedFiles(
            "src/scripts",
            (file) =>
                file.endsWith(".js") &&
                file !== siteConfig.analyticsScript,
        )
    )
        .map(({ text }) => text)
        .join("\n\n");
    const scriptBundles = new Map();

    for (const { scripts } of siteConfig.caseStudies) {
        const bundleKey = scripts.join("\0");

        if (!scriptBundles.has(bundleKey)) {
            const bundle = (
                await Promise.all(
                    scripts.map((file) => readText(`src/scripts/${file}`)),
                )
            )
                .map((text) => text.trimEnd())
                .join("\n\n");

            scriptBundles.set(bundleKey, bundle);
        }
    }

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
        styles,
    );
    indexHtml = replaceToken(
        indexHtml,
        "<!-- @inline-js:analytics-bootstrap -->",
        analyticsBootstrap,
    );
    indexHtml = replaceToken(
        indexHtml,
        "<!-- @inline-js:site -->",
        siteScript,
    );

    if (indexHtml.includes("<!-- @inline-")) {
        throw new Error("Generated HTML still contains inline tokens.");
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
        html = replaceToken(html, "<!-- @inline-css:site -->", styles);
        html = replaceToken(
            html,
            "<!-- @inline-js:analytics-bootstrap -->",
            analyticsBootstrap,
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

        return html;
    }

    const casePages = Object.fromEntries(
        await Promise.all(
            siteConfig.caseStudies.map(async (caseStudy) => [
                caseStudy.slug,
                await buildCasePage(caseStudy),
            ]),
        ),
    );

    if (write) {
        await writeFile(path.join(root, "index.html"), indexHtml);
        await writeFile(path.join(root, "profile.json"), profileJson);

        await Promise.all(
            Object.entries(casePages).map(async ([slug, html]) => {
                await mkdir(path.join(root, slug), { recursive: true });
                await writeFile(path.join(root, slug, "index.html"), html);
            }),
        );
    }

    return {
        casePages,
        caseScripts,
        indexHtml,
        profileJson,
        siteScript,
    };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    await buildPage();
}
