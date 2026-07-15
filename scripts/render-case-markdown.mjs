import { readFile } from "node:fs/promises";
import path from "node:path";

function escapeHtml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}

function token(kind, value) {
    return `<span class="tok-${kind}">${escapeHtml(value)}</span>`;
}

function readQuoted(source, start) {
    const quote = source[start];
    let index = start + 1;
    while (index < source.length) {
        if (source[index] === "\\") {
            index += 2;
            continue;
        }
        if (source[index] === quote) {
            return source.slice(start, index + 1);
        }
        index += 1;
    }
    return null;
}

function highlightCss(source) {
    let output = "";
    let index = 0;
    let valueContext = false;

    while (index < source.length) {
        if (source.startsWith("/*", index)) {
            const end = source.indexOf("*/", index + 2);
            if (end === -1) return escapeHtml(source);
            const value = source.slice(index, end + 2);
            output += token("comment", value);
            index = end + 2;
            continue;
        }

        const quoted =
            source[index] === '"' || source[index] === "'"
                ? readQuoted(source, index)
                : null;
        if ((source[index] === '"' || source[index] === "'") && !quoted) {
            return escapeHtml(source);
        }
        if (quoted) {
            output += token("string", quoted);
            index += quoted.length;
            continue;
        }

        const whitespace = source.slice(index).match(/^\s+/)?.[0];
        if (whitespace) {
            output += escapeHtml(whitespace);
            index += whitespace.length;
            continue;
        }

        const hex = source.slice(index).match(/^#[0-9a-fA-F]{3,8}\b/)?.[0];
        if (hex) {
            output += token("number", hex);
            index += hex.length;
            continue;
        }

        const number = source
            .slice(index)
            .match(/^(?:\d+(?:\.\d+)?|\.\d+)(?:%|[a-zA-Z]+)?/)?.[0];
        if (number) {
            output += token("number", number);
            index += number.length;
            continue;
        }

        const atRule = source.slice(index).match(/^@[a-z-]+/i)?.[0];
        if (atRule) {
            output += token("keyword", atRule);
            index += atRule.length;
            continue;
        }

        const identifier = source
            .slice(index)
            .match(/^(?:--)?[a-zA-Z_][\w-]*/)?.[0];
        if (identifier) {
            const next = source
                .slice(index + identifier.length)
                .match(/^\s*([:{])/)?.[1];
            const kind =
                next === ":" && !valueContext
                    ? "key"
                    : next === "{" || !valueContext
                      ? "key"
                      : "value";
            output += token(kind, identifier);
            if (next === ":") valueContext = true;
            index += identifier.length;
            continue;
        }

        const punctuation = source[index];
        if (":;{},().[]".includes(punctuation)) {
            output += token("punctuation", punctuation);
            if (punctuation === ";" || punctuation === "}") valueContext = false;
            index += 1;
            continue;
        }

        if ("+>/=~*".includes(punctuation)) {
            output += token("operator", punctuation);
            index += 1;
            continue;
        }

        output += escapeHtml(punctuation);
        index += 1;
    }

    return output;
}

function highlightToml(source) {
    let output = "";
    let index = 0;
    let tableContext = false;

    while (index < source.length) {
        if (source[index] === "#") {
            const end = source.indexOf("\n", index);
            const value = source.slice(index, end === -1 ? source.length : end);
            output += token("comment", value);
            index += value.length;
            continue;
        }

        const quoted =
            source[index] === '"' || source[index] === "'"
                ? readQuoted(source, index)
                : null;
        if ((source[index] === '"' || source[index] === "'") && !quoted) {
            return escapeHtml(source);
        }
        if (quoted) {
            output += token("string", quoted);
            index += quoted.length;
            continue;
        }

        const whitespace = source.slice(index).match(/^\s+/)?.[0];
        if (whitespace) {
            output += escapeHtml(whitespace);
            index += whitespace.length;
            continue;
        }

        const number = source
            .slice(index)
            .match(/^-?(?:\d+(?:\.\d+)?|\.\d+)(?:[a-zA-Z]+)?/)?.[0];
        if (number) {
            output += token("number", number);
            index += number.length;
            continue;
        }

        const identifier = source.slice(index).match(/^[a-zA-Z_][\w.-]*/)?.[0];
        if (identifier) {
            const next = source
                .slice(index + identifier.length)
                .match(/^\s*([=.\]])/)?.[1];
            output += token(tableContext || next === "=" ? "key" : "value", identifier);
            index += identifier.length;
            continue;
        }

        const punctuation = source[index];
        if ("[]{},.".includes(punctuation)) {
            output += token("punctuation", punctuation);
            if (punctuation === "[") tableContext = true;
            if (punctuation === "]") tableContext = false;
            index += 1;
            continue;
        }

        if (punctuation === "=") {
            output += token("operator", punctuation);
            index += 1;
            continue;
        }

        output += escapeHtml(punctuation);
        index += 1;
    }

    return output;
}

function highlightBash(source) {
    const keywords = new Set([
        "case",
        "do",
        "done",
        "else",
        "esac",
        "fi",
        "for",
        "function",
        "if",
        "in",
        "then",
        "while",
    ]);
    let output = "";
    let index = 0;

    while (index < source.length) {
        if (source[index] === "#") {
            const end = source.indexOf("\n", index);
            const value = source.slice(index, end === -1 ? source.length : end);
            output += token("comment", value);
            index += value.length;
            continue;
        }

        const quoted =
            source[index] === '"' || source[index] === "'"
                ? readQuoted(source, index)
                : null;
        if ((source[index] === '"' || source[index] === "'") && !quoted) {
            return escapeHtml(source);
        }
        if (quoted) {
            output += token("string", quoted);
            index += quoted.length;
            continue;
        }

        const variable = source
            .slice(index)
            .match(/^\$[{]?[a-zA-Z_][\w]*[}]?/)?.[0];
        if (variable) {
            output += token("value", variable);
            index += variable.length;
            continue;
        }

        const whitespace = source.slice(index).match(/^\s+/)?.[0];
        if (whitespace) {
            output += escapeHtml(whitespace);
            index += whitespace.length;
            continue;
        }

        const number = source.slice(index).match(/^\d+(?:\.\d+)?/)?.[0];
        if (number) {
            output += token("number", number);
            index += number.length;
            continue;
        }

        const identifier = source.slice(index).match(/^[a-zA-Z_][\w-]*/)?.[0];
        if (identifier) {
            output += token(
                keywords.has(identifier) ? "keyword" : "key",
                identifier,
            );
            index += identifier.length;
            continue;
        }

        const punctuation = source[index];
        if ("(){}[],;".includes(punctuation)) {
            output += token("punctuation", punctuation);
            index += 1;
            continue;
        }

        if ("|&><=+".includes(punctuation)) {
            output += token("operator", punctuation);
            index += 1;
            continue;
        }

        output += escapeHtml(punctuation);
        index += 1;
    }

    return output;
}

function highlightCode(language, source) {
    const normalizedLanguage = language.toLowerCase();
    if (!["css", "toml", "bash"].includes(normalizedLanguage)) {
        return escapeHtml(source).replaceAll("\n", "&#10;");
    }

    const highlighted = (() => {
        switch (normalizedLanguage) {
            case "css":
                return highlightCss(source);
            case "toml":
                return highlightToml(source);
            default:
                return highlightBash(source);
        }
    })();

    return highlighted.replaceAll("\n", "&#10;");
}

function renderInline(source) {
    let html = escapeHtml(source.trim());
    const code = [];

    html = html.replace(/`([^`]+)`/g, (_, value) => {
        code.push(`<code>${value}</code>`);
        return `\u0000CODE${code.length - 1}\u0000`;
    });
    html = html.replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a class="external-link" href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
    );
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    html = html.replace(/\u0000CODE(\d+)\u0000/g, (_, index) => code[index]);

    return html;
}

function parseMarkdown(markdown) {
    const lines = markdown.replaceAll("\r\n", "\n").trim().split("\n");
    const titleLine = lines.shift();

    if (!titleLine?.startsWith("# ")) {
        throw new Error("Case Markdown must begin with one # title.");
    }

    while (lines[0] === "") lines.shift();
    const deckLine = lines[0]?.startsWith("> ") ? lines.shift() : null;

    while (lines[0] === "") lines.shift();
    const metadata = [];
    while (lines[0]?.startsWith("- **")) {
        const match = lines.shift().match(/^- \*\*([^*]+):\*\*\s+(.+)$/);
        if (!match) throw new Error("Metadata must use - **Label:** Value.");
        metadata.push({ label: match[1], value: match[2] });
    }
    if (metadata.length !== 0 && metadata.length !== 3) {
        throw new Error("Case metadata must contain either zero or three rows.");
    }

    const blocks = [];
    for (let index = 0; index < lines.length; ) {
        const line = lines[index];
        if (!line) {
            index += 1;
            continue;
        }
        if (line.startsWith("## ")) {
            blocks.push({ type: "h2", value: line.slice(3) });
            index += 1;
            continue;
        }
        if (line.startsWith("### ")) {
            blocks.push({ type: "h3", value: line.slice(4) });
            index += 1;
            continue;
        }
        const media = line.match(/^!\[(.*)\]\(media:([a-z0-9-]+)\)$/);
        if (media) {
            blocks.push({
                type: "media",
                caption: media[1],
                id: media[2],
                joinsPrevious:
                    index > 0 && /^!\[.*\]\(media:[a-z0-9-]+\)$/.test(lines[index - 1]),
            });
            index += 1;
            continue;
        }
        if (line.startsWith("```")) {
            const fence = line.match(/^```([^\s`]*)?/);
            const title = line.match(/title="([^"]+)"/)?.[1] ?? "";
            const language = fence?.[1] ?? "";
            const code = [];
            index += 1;
            while (index < lines.length && !lines[index].startsWith("```")) {
                code.push(lines[index]);
                index += 1;
            }
            if (index === lines.length) throw new Error("Unclosed fenced code block.");
            blocks.push({
                type: "code",
                language,
                title,
                value: code.join("\n"),
            });
            index += 1;
            continue;
        }
        if (line.startsWith("- ")) {
            const items = [];
            while (lines[index]?.startsWith("- ")) {
                items.push(lines[index].slice(2));
                index += 1;
            }
            blocks.push({ type: "list", items });
            continue;
        }

        const paragraph = [];
        while (
            index < lines.length &&
            lines[index] &&
            !lines[index].startsWith("## ") &&
            !lines[index].startsWith("### ") &&
            !lines[index].startsWith("```") &&
            !lines[index].startsWith("- ") &&
            !/^!\[.*\]\(media:[a-z0-9-]+\)$/.test(lines[index])
        ) {
            paragraph.push(lines[index]);
            index += 1;
        }
        blocks.push({ type: "paragraph", value: paragraph.join(" ") });
    }

    return {
        title: titleLine.slice(2),
        deck: deckLine?.slice(2) ?? null,
        metadata,
        blocks,
    };
}

async function renderMedia(root, slug, media, resolveIncludes) {
    const figures = await Promise.all(
        media.map(async ({ caption, id }) => {
            const source = await readFile(
                path.join(root, "src/case-media", slug, `${id}.html`),
                "utf8",
            );
            const image = (await resolveIncludes(source)).trim();
            const renderedCaption = caption
                ? `\n    <figcaption class="case-caption">${renderInline(caption)}</figcaption>`
                : "";
            return `<figure>\n    ${image}${renderedCaption}\n</figure>`;
        }),
    );
    const className = figures.length === 1 ? "case-media" : "case-media-grid";
    return `<div class="${className}">\n${figures.join("\n")}\n</div>`;
}

export async function renderCaseMarkdown({ root, slug, resolveIncludes }) {
    const markdown = await readFile(path.join(root, "content", `${slug}.md`), "utf8");
    const parsed = parseMarkdown(markdown);
    const output = [
        '<header class="case-intro">',
        `    <h1 class="case-title">${renderInline(parsed.title)}</h1>`,
        ...(parsed.deck
            ? [`    <p class="case-deck">${renderInline(parsed.deck)}</p>`]
            : []),
        ...(parsed.metadata.length
            ? [
                  '    <dl class="case-meta">',
                  ...parsed.metadata.map(
                      ({ label, value }) =>
                          `        <div><dt>${renderInline(label)}</dt><dd>${renderInline(value)}</dd></div>`,
                  ),
                  "    </dl>",
              ]
            : []),
        "</header>",
    ];

    let sectionOpen = false;
    let copyOpen = false;
    for (let index = 0; index < parsed.blocks.length; index += 1) {
        const block = parsed.blocks[index];
        if (block.type === "h2") {
            if (copyOpen) output.push("    </div>");
            if (sectionOpen) output.push("</section>");
            output.push(
                '<section class="case-section">',
                '    <div class="case-copy">',
                `        <h2>${renderInline(block.value)}</h2>`,
            );
            sectionOpen = true;
            copyOpen = true;
            continue;
        }
        if (["h3", "paragraph", "list"].includes(block.type) && !copyOpen) {
            output.push('    <div class="case-copy">');
            copyOpen = true;
        }
        if (block.type === "h3") {
            output.push(`        <h3>${renderInline(block.value)}</h3>`);
            continue;
        }
        if (block.type === "paragraph") {
            output.push(`        <p>${renderInline(block.value)}</p>`);
            continue;
        }
        if (block.type === "list") {
            output.push(
                "        <ul>",
                ...block.items.map((item) => `            <li>${renderInline(item)}</li>`),
                "        </ul>",
            );
            continue;
        }
        if (copyOpen) {
            output.push("    </div>");
            copyOpen = false;
        }
        if (block.type === "media") {
            const media = [block];
            while (
                parsed.blocks[index + 1]?.type === "media" &&
                parsed.blocks[index + 1].joinsPrevious
            ) {
                media.push(parsed.blocks[index + 1]);
                index += 1;
            }
            output.push(await renderMedia(root, slug, media, resolveIncludes));
        } else if (block.type === "code") {
            const label = block.title
                ? `<p class="case-code-label">${renderInline(block.title)}</p>\n`
                : "";
            output.push(
                `<div class="case-code">\n${label}<pre><code>${highlightCode(block.language, block.value)}</code></pre>\n</div>`,
            );
        }
    }
    if (copyOpen) output.push("    </div>");
    if (sectionOpen) output.push("</section>");

    return output.join("\n");
}
