import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { sitePaths } from "./site-config.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, sitePaths.output);

async function readText(relativePath) {
	return readFile(path.join(root, relativePath), "utf8");
}

async function readPublicText(relativePath) {
	return readFile(path.join(output, relativePath), "utf8");
}

async function readJson(relativePath) {
	try {
		return JSON.parse(await readText(relativePath));
	} catch (error) {
		throw new Error(`Invalid JSON in ${relativePath}`, { cause: error });
	}
}

async function readPublicJson(relativePath) {
	try {
		return JSON.parse(await readPublicText(relativePath));
	} catch (error) {
		throw new Error(`Invalid JSON in public/${relativePath}`, { cause: error });
	}
}

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

const [
    apiCatalog,
    skillsIndex,
    skill,
	serverCard,
	mcpManifest,
	aiCatalog,
    openapi,
    authMarkdown,
    webMcp,
    cloudflareHeaders,
    cloudflareRedirects,
    cloudflareRoutes,
    pagesRouter,
    mcpFunction,
    packageJson,
 ] = await Promise.all([
    readPublicJson(".well-known/api-catalog"),
    readPublicJson(".well-known/agent-skills/index.json"),
    readPublicText(".well-known/agent-skills/portfolio-discovery/SKILL.md"),
    readPublicJson(".well-known/mcp/server-card.json"),
    readPublicJson(".well-known/mcp.json"),
    readPublicJson(".well-known/ai-catalog.json"),
    readPublicJson("openapi.json"),
    readPublicText("auth.md"),
    readText("src/scripts/80-webmcp.js"),
    readPublicText("_headers"),
    readPublicText("_redirects"),
    readPublicJson("_routes.json"),
    readText("functions/[[path]].js"),
    readText("functions/mcp.js"),
    readJson("package.json"),
]);

assert(
	Array.isArray(apiCatalog.linkset) &&
		apiCatalog.linkset.length > 0 &&
		apiCatalog.linkset.every(
			(entry) =>
				entry.anchor &&
				entry["service-desc"]?.length &&
				entry["service-doc"]?.length &&
				entry.status?.length,
		),
	"API catalog entries must include anchor, service-desc, service-doc, and status links.",
);

const skillDigest = createHash("sha256").update(skill).digest("hex");
assert(
	skillsIndex.$schema ===
		"https://schemas.agentskills.io/discovery/0.2.0/schema.json" &&
		skillsIndex.skills.length === 1 &&
		skillsIndex.skills[0].digest === `sha256:${skillDigest}`,
	"Agent Skills index must use schema v0.2.0 and match the published skill digest.",
);

assert(
	serverCard.serverInfo?.name === serverCard.name &&
		serverCard.serverInfo?.version === serverCard.version &&
		serverCard.transport?.endpoint === "https://gildrb.com/mcp" &&
		serverCard.remotes?.some(
			(remote) =>
				remote.type === "streamable-http" &&
				remote.url === "https://gildrb.com/mcp",
		) &&
		serverCard.capabilities?.tools,
	"MCP Server Card identity, transport, and capabilities must remain consistent.",
);
assert(
	aiCatalog.host?.displayName &&
		Array.isArray(aiCatalog.entries) &&
		aiCatalog.entries.length > 0 &&
		aiCatalog.entries.every(
			(entry) =>
				entry.identifier?.startsWith("urn:air:gildrb.com:") &&
				entry.displayName &&
				entry.type &&
				Boolean(entry.url) !== Boolean(entry.data),
		),
	"AI Catalog entries must carry a domain-anchored identifier, a display name, a type, and exactly one of url or data.",
);

assert(
	mcpManifest.mcpVersion === undefined &&
		typeof mcpManifest.mcp_version === "string" &&
		mcpManifest.endpoints?.streamable_http === "https://gildrb.com/mcp" &&
		mcpManifest.capabilities?.tools === true &&
		mcpManifest.authentication?.required === false,
	"The MCP manifest at /.well-known/mcp must advertise the Streamable HTTP endpoint without authentication.",
);

assert(
	openapi.openapi === "3.1.0" &&
		openapi.paths["/api/v1/profile"] &&
		openapi.paths["/api/v1/status"] &&
		openapi.paths["/mcp"],
	"OpenAPI must describe versioned profile, status, and MCP endpoints.",
);

assert(
	openapi.components?.schemas?.Problem?.required?.includes("title") &&
		Object.values(openapi.components.responses).some(
			(response) =>
				response.content?.["application/problem+json"]?.schema?.$ref ===
				"#/components/schemas/Problem",
		) &&
		Object.values(openapi.paths).every((path) =>
			Object.values(path).every(
				(operation) => operation.responses && operation.description,
			),
		),
	"OpenAPI must define a typed problem-details error model, use it on error responses, and describe every operation.",
);

assert(
	openapi.components?.headers?.RateLimitPolicy &&
		openapi.components?.responses?.TooManyRequests?.headers?.["Retry-After"],
	"OpenAPI must document rate-limit headers and Retry-After on 429.",
);

const [
    cloudflareMiddleware,
    statusFunction,
    statusV1Function,
    llmsReference,
    wellKnownLlms,
    sitemap,
    pageTemplate,
    notFoundPage,
    apiDocs,
] = await Promise.all([
    readText("functions/_middleware.js"),
    readText("functions/api/status.js"),
    readText("functions/api/v1/status.js"),
    readPublicText("llms.txt"),
    readPublicText(".well-known/llms.txt"),
    readPublicText("sitemap.xml"),
    readText("src/page.template.html"),
    readPublicText("404.html"),
    readPublicText("api-docs.md"),
]);

assert(
	pagesRouter.includes('["/api/v1/profile", "/profile.json"]') &&
		statusV1Function.includes('from "../status.js"') &&
		pagesRouter.includes('"/api/v1/"') &&
		cloudflareMiddleware.includes("application/problem+json") &&
		pagesRouter.includes("application/problem+json") &&
		statusFunction.includes("application/problem+json"),
	"API v1 aliases must route, and API errors must return RFC 9457 problem+json.",
);

assert(
	pagesRouter.includes('"RateLimit-Limit": "60"') &&
		pagesRouter.includes('"RateLimit-Policy": "60;w=60"') &&
		statusFunction.includes('"RateLimit-Limit": "60"') &&
		mcpFunction.includes('"RateLimit-Limit": "60"'),
	"Every API surface must advertise rate-limit headers.",
);

const trustPages = ["about", "contact", "privacy", "developers"];
for (const page of trustPages) {
	const html = await readPublicText(`${page}/index.html`);
	const markdown = await readText(`${sitePaths.contentSource}/${page}.md`);
	assert(
		html.includes(`href="https://gildrb.com/${page}"`) &&
			html.includes(`href="https://gildrb.com/content/${page}.md"`) &&
			markdown.replace(/\s/g, "").length >= 500,
		`The /${page} trust page must be canonical, link its Markdown form, and hold at least 500 characters of content.`,
	);
	assert(
		pagesRouter.includes(`["/${page}", "/content/${page}.md"]`) &&
			sitemap.includes(`https://gildrb.com/${page}`) &&
			sitemap.includes(`https://gildrb.com/content/${page}.md`),
		`The /${page} page must negotiate Markdown and appear in the sitemap.`,
	);
}

assert(
	llmsReference.includes("## When to use this") &&
		wellKnownLlms.includes("## When to use this") &&
		llmsReference.includes("https://gildrb.com/developers") &&
		llmsReference.includes("https://gildrb.com/about") &&
		llmsReference.includes("https://gildrb.com/contact") &&
		llmsReference.includes("https://gildrb.com/privacy"),
	"Both LLM references must carry when-to-use guidance and link the trust and developer pages.",
);

const devResourceUrls = [
	"https://gildrb.com/api-docs.md",
	"https://gildrb.com/auth.md",
	"https://gildrb.com/openapi.json",
	"https://gildrb.com/.well-known/mcp",
];

assert(
	llmsReference.includes("## Developer resources") &&
		wellKnownLlms.includes("## Developer resources") &&
		devResourceUrls.every(
			(url) => llmsReference.includes(url) && wellKnownLlms.includes(url),
		),
	"Both LLM references must expose a named developer resources section covering docs, auth, OpenAPI, and the MCP manifest.",
);

assert(
	pageTemplate.includes('property="og:image"') &&
		pageTemplate.includes("https://gildrb.com/images/og-image.png"),
	"The homepage must publish an absolute og:image for entity resolution.",
);

assert(
	notFoundPage.includes('href="/llms.txt"') &&
		notFoundPage.includes('href="/sitemap.xml"') &&
		notFoundPage.includes('href="/developers"') &&
		notFoundPage.includes("HTTP 404"),
	"The 404 page must help agents recover with sitemap, llms.txt, and developer links.",
);

assert(
	apiDocs.includes("/api/v1/") &&
		apiDocs.includes("RateLimit-Policy") &&
		apiDocs.includes("problem+json") &&
		apiDocs.includes("Sunset"),
	"api-docs.md must document versioning, rate limits, and the error model.",
);

assert(
	authMarkdown.startsWith("# auth.md") &&
		authMarkdown.includes("No registration") &&
		authMarkdown.includes("without an `Authorization` header"),
	"auth.md must state the public no-registration, no-credential contract.",
);

assert(
	webMcp.includes("navigator.modelContext") &&
		webMcp.includes("document.modelContext") &&
		webMcp.includes("registerTool") &&
		webMcp.includes("provideContext") &&
		webMcp.includes("AbortController"),
	"WebMCP must support current and legacy modelContext APIs with unregister signals.",
);

const markdownRoutes = [
	"/",
	"/all",
	"/filen",
	"/heph",
	"/ben-davis",
	"/t3",
	"/ml7",
	"/n0thing",
	"/curves",
	"/site",
];
assert(
    markdownRoutes.every((route) =>
        pagesRouter.includes(`[\"${route}\",`),
    ) &&
        cloudflareRoutes.include.includes("/*") &&
        pagesRouter.includes('includes(\"text/markdown\")') &&
        pagesRouter.includes(
            '\"Content-Type\": \"text/markdown; charset=utf-8\"',
        ) &&
        cloudflareHeaders.includes("Vary: Accept"),
    "Every HTML page must negotiate Markdown through the catch-all Cloudflare Pages Function route.",
);

assert(
    ![cloudflareHeaders, cloudflareRedirects, pagesRouter, mcpFunction].some(
        (text) =>
            text.includes("openid-configuration") ||
            text.includes("oauth-authorization-server") ||
            text.includes("oauth-protected-resource"),
    ) &&
        !JSON.stringify(packageJson).toLowerCase().includes("vercel") &&
        cloudflareRedirects.includes(
            "https://www.gildrb.com/* https://gildrb.com/:splat 301",
        ) &&
        mcpFunction.includes("env.ASSETS.fetch") &&
        mcpFunction.includes("pages\\.dev"),
    "Cloudflare Pages must be the sole runtime, preserve the canonical host, and avoid false OAuth metadata.",
);

console.log("Agent-readiness discovery contracts passed.");
