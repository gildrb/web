const SERVER_INFO = Object.freeze({
	name: "com.gildrb/portfolio",
	version: "1.0.0",
});

const PROTOCOL_VERSIONS = Object.freeze(["2025-11-25", "2025-06-18"]);
const PAGE_SLUGS = Object.freeze([
	"site",
	"t3",
	"ben-davis",
	"heph",
	"filen",
	"n0thing",
	"curves",
	"ml7",
]);

const TOOLS = Object.freeze([
	{
		name: "list_portfolio_pages",
		description: "List the public portfolio pages and their Markdown URLs.",
		inputSchema: {
			type: "object",
			properties: {},
			additionalProperties: false,
		},
		annotations: { readOnlyHint: true },
	},
	{
		name: "get_portfolio_page",
		description: "Read one public portfolio case study as Markdown.",
		inputSchema: {
			type: "object",
			properties: {
				slug: {
					type: "string",
					enum: PAGE_SLUGS,
					description: "The case-study slug to retrieve.",
				},
			},
			required: ["slug"],
			additionalProperties: false,
		},
		annotations: { readOnlyHint: true },
	},
]);

function responseHeaders(origin) {
	const headers = new Headers({
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		"Access-Control-Allow-Headers":
			"Content-Type, MCP-Protocol-Version, MCP-Session-Id",
		"Cache-Control": "no-store",
		"Content-Type": "application/json; charset=utf-8",
		"RateLimit-Limit": "60",
		"RateLimit-Policy": "60;w=60",
		"X-API-Version": "v1",
		"X-Content-Type-Options": "nosniff",
	});
	if (origin) {
		headers.set("Access-Control-Allow-Origin", origin);
		headers.set("Vary", "Origin");
	}
	return headers;
}

function isAllowedOrigin(origin) {
	return (
		!origin ||
		origin === "https://gildrb.com" ||
		origin === "https://www.gildrb.com" ||
		/^https:\/\/(?:[a-z0-9-]+\.)+pages\.dev$/i.test(origin)
	);
}

function jsonResponse(body, status, origin) {
	return Response.json(body, {
		status,
		headers: responseHeaders(origin),
	});
}

function problemJsonResponse(origin, status, title, detail) {
	const headers = responseHeaders(origin);
	headers.set("Content-Type", "application/problem+json; charset=utf-8");
	return new Response(
		`${JSON.stringify(
			{
				type: "https://gildrb.com/api-docs.md#errors",
				title,
				status,
				detail,
			},
			null,
			2,
		)}\n`,
		{
			status,
			headers,
		},
	);
}

function jsonRpcError(id, code, message) {
	return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

function textResult(text) {
	return { content: [{ type: "text", text }] };
}

async function callTool(env, requestUrl, name, args) {
	if (name === "list_portfolio_pages") {
		return textResult(
			JSON.stringify(
				PAGE_SLUGS.map((slug) => ({
					slug,
					url: `https://gildrb.com/${slug}`,
					markdown: `https://gildrb.com/content/${slug}.md`,
				})),
				null,
				2,
			),
		);
	}

	if (name === "get_portfolio_page") {
		const slug = args?.slug;
		if (!PAGE_SLUGS.includes(slug)) {
			return {
				...textResult(`Unknown portfolio slug: ${String(slug)}`),
				isError: true,
			};
		}

		const assetUrl = new URL(`/content/${slug}.md`, requestUrl);
		const response = await env.ASSETS.fetch(assetUrl);
		if (!response.ok) {
			return {
				...textResult(`Unable to retrieve ${slug}.`),
				isError: true,
			};
		}
		return textResult(await response.text());
	}

	return {
		...textResult(`Unknown tool: ${String(name)}`),
		isError: true,
	};
}

async function handleRequest(env, requestUrl, message) {
	const { id, method, params } = message;

	if (method === "initialize") {
		const requestedVersion = params?.protocolVersion;
		return {
			jsonrpc: "2.0",
			id,
			result: {
				protocolVersion: PROTOCOL_VERSIONS.includes(requestedVersion)
					? requestedVersion
					: PROTOCOL_VERSIONS[0],
				capabilities: { tools: { listChanged: false } },
				serverInfo: SERVER_INFO,
				instructions:
					"Use the read-only tools to discover and retrieve Gil Rodrigues portfolio pages.",
			},
		};
	}
	if (method === "ping") {
		return { jsonrpc: "2.0", id, result: {} };
	}
	if (method === "tools/list") {
		return { jsonrpc: "2.0", id, result: { tools: TOOLS } };
	}
	if (method === "tools/call") {
		return {
			jsonrpc: "2.0",
			id,
			result: await callTool(env, requestUrl, params?.name, params?.arguments),
		};
	}
	return jsonRpcError(id, -32601, `Method not found: ${String(method)}`);
}

export async function onRequest({ env, request }) {
	if (request.url.startsWith("https://www.gildrb.com/")) {
		return Response.redirect(
			request.url.replace("https://www.gildrb.com/", "https://gildrb.com/"),
			301,
		);
	}
	const origin = request.headers.get("Origin");
	if (!isAllowedOrigin(origin)) {
		return problemJsonResponse(
			origin,
			403,
			"Forbidden",
			"Origin not allowed by the MCP CORS policy.",
		);
	}
	if (request.method === "OPTIONS") {
		return new Response(null, {
			status: 204,
			headers: responseHeaders(origin),
		});
	}
	if (request.method !== "POST") {
		const response = problemJsonResponse(
			origin,
			405,
			"Method Not Allowed",
			"Use POST with a JSON-RPC body, or OPTIONS for CORS preflight.",
		);
		response.headers.set("Allow", "POST, OPTIONS");
		return response;
	}

	const contentLength = Number(request.headers.get("Content-Length") ?? 0);
	if (!Number.isFinite(contentLength) || contentLength > 65_536) {
		return problemJsonResponse(
			origin,
			413,
			"Content Too Large",
			"Request body exceeds the 64 KiB limit.",
		);
	}

	let message;
	try {
		message = await request.json();
	} catch {
		return jsonResponse(jsonRpcError(null, -32700, "Parse error"), 400, origin);
	}
	if (
		!message ||
		Array.isArray(message) ||
		message.jsonrpc !== "2.0" ||
		typeof message.method !== "string"
	) {
		return jsonResponse(
			jsonRpcError(null, -32600, "Invalid Request"),
			400,
			origin,
		);
	}
	if (message.id === undefined) {
		return new Response(null, {
			status: 202,
			headers: responseHeaders(origin),
		});
	}

	try {
		return jsonResponse(
			await handleRequest(env, request.url, message),
			200,
			origin,
		);
	} catch {
		return jsonResponse(
			jsonRpcError(message.id, -32603, "Internal error"),
			500,
			origin,
		);
	}
}
