import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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
    const includePattern = /<!-- @include:([^>]+) -->/g;
    const matches = [...template.matchAll(includePattern)];
    let html = template.replace(
        /\n?<!-- @template-only:start -->[\s\S]*?<!-- @template-only:end -->\n?/g,
        "\n",
    );

    for (const match of matches) {
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
    const profile = JSON.parse(await readText("src/data/profile.schema.json"));
    const profileJson = `${JSON.stringify(profile, null, 2)}\n`;
    const styles = (await readSortedFiles("src/styles", (file) =>
        file.endsWith(".css"),
    ))
        .map(({ text }) => text)
        .join("\n\n");
    const analyticsBootstrap = (
        await readText("src/scripts/00-analytics-bootstrap.js")
    ).trimEnd();
    const siteScript = (
        await readSortedFiles(
            "src/scripts",
            (file) =>
                file.endsWith(".js") &&
                file !== "00-analytics-bootstrap.js",
        )
    )
        .map(({ text }) => text)
        .join("\n\n");
    const caseScript = (
        await Promise.all(
            ["10-core.js", "20-theme.js"].map((file) =>
                readText(`src/scripts/${file}`),
            ),
        )
    )
        .map((text) => text.trimEnd())
        .join("\n\n");

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

    async function buildCasePage(templatePath) {
        let html = await resolveIncludes(await readText(templatePath));
        html = replaceToken(html, "<!-- @inline-css:site -->", styles);
        html = replaceToken(
            html,
            "<!-- @inline-js:analytics-bootstrap -->",
            analyticsBootstrap,
        );
        html = replaceToken(html, "<!-- @inline-js:case -->", caseScript);

        if (html.includes("<!-- @inline-")) {
            throw new Error(
                `Generated ${templatePath} still contains inline tokens.`,
            );
        }

        return html;
    }

    const [filenHtml, ml7Html, n0thingHtml] = await Promise.all([
        buildCasePage("src/filen.template.html"),
        buildCasePage("src/ml7.template.html"),
        buildCasePage("src/n0thing.template.html"),
    ]);

    if (write) {
        await writeFile(path.join(root, "index.html"), indexHtml);
        await writeFile(path.join(root, "profile.json"), profileJson);
        await mkdir(path.join(root, "filen"), { recursive: true });
        await writeFile(path.join(root, "filen/index.html"), filenHtml);
        await mkdir(path.join(root, "ml7"), { recursive: true });
        await writeFile(path.join(root, "ml7/index.html"), ml7Html);
        await mkdir(path.join(root, "n0thing"), { recursive: true });
        await writeFile(path.join(root, "n0thing/index.html"), n0thingHtml);
    }

    return {
        caseScript,
        filenHtml,
        indexHtml,
        ml7Html,
        n0thingHtml,
        profileJson,
        siteScript,
    };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    await buildPage();
}
