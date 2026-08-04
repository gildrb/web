import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function readText(relativePath) {
	return readFile(path.join(root, relativePath), "utf8");
}

async function readJson(relativePath) {
	try {
		return JSON.parse(await readText(relativePath));
	} catch (error) {
		throw new Error(`Invalid JSON in ${relativePath}`, { cause: error });
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
    readJson(".well-known/api-catalog"),
    readJson(".well-known/agent-skills/index.json"),
    readText(".well-known/agent-skills/portfolio-discovery/SKILL.md"),
    readJson(".well-known/mcp/server-card.json"),
    readJson(".well-known/ai-catalog.json"),
    readJson("openapi.json"),
    readText("auth.md"),
    readText("src/scripts/80-webmcp.js"),
    readText("_headers"),
    readText("_redirects"),
    readJson("_routes.json"),
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
	aiCatalog.entries?.some(
		(entry) =>
			entry.type === "application/mcp-server-card+json" &&
			entry.url === "https://gildrb.com/.well-known/mcp/server-card.json",
	),
	"AI Catalog must advertise the MCP Server Card.",
);

assert(
	openapi.openapi === "3.1.0" &&
		openapi.paths["/api/profile"] &&
		openapi.paths["/api/status"] &&
		openapi.paths["/mcp"],
	"OpenAPI must describe profile, status, and MCP endpoints.",
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
    markdownRoutes.every(
        (route) =>
            pagesRouter.includes(`[\"${route}\",`) &&
            cloudflareRoutes.include.includes(route),
    ) &&
        pagesRouter.includes('includes(\"text/markdown\")') &&
        pagesRouter.includes(
            '\"Content-Type\": \"text/markdown; charset=utf-8\"',
        ) &&
        cloudflareHeaders.includes("Vary: Accept"),
    "Every HTML page must negotiate Markdown through a bounded Cloudflare Pages Function route.",
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
