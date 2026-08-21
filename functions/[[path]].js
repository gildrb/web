const markdownRepresentations = new Map([
	["/", "/index.html.md"],
	["/all", "/llms-full.txt"],
	["/filen", "/content/filen.md"],
	["/heph", "/content/heph.md"],
	["/ben-davis", "/content/ben-davis.md"],
	["/t3", "/content/t3.md"],
	["/ml7", "/content/ml7.md"],
	["/n0thing", "/content/n0thing.md"],
	["/curves", "/content/curves.md"],
	["/site", "/content/site.md"],
	["/about", "/content/about.md"],
	["/contact", "/content/contact.md"],
	["/privacy", "/content/privacy.md"],
	["/developers", "/content/developers.md"],
]);

const staticAliases = new Map([
	["/api/profile", "/profile.json"],
	["/api/v1/profile", "/profile.json"],
	["/mcp/server-card", "/.well-known/mcp/server-card.json"],
]);

const API_RESPONSE_HEADERS = {
	"RateLimit-Limit": "60",
	"RateLimit-Policy": "60;w=60",
	"X-API-Version": "v1",
};

function withHeaders(response, headers) {
	const nextHeaders = new Headers(response.headers);
	for (const [name, value] of Object.entries(headers)) {
		nextHeaders.set(name, value);
	}
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: nextHeaders,
	});
}

export async function onRequest({ env, request }) {
	let url;
	try {
		url = new URL(request.url);
	} catch {
		return Response.json({ error: "Invalid request URL" }, { status: 400 });
	}
	if (url.hostname === "www.gildrb.com") {
		url.hostname = "gildrb.com";
		return Response.redirect(url, 301);
	}
	const pathname = url.pathname;
	const acceptsMarkdown = request.headers
		.get("Accept")
		?.toLowerCase()
		.includes("text/markdown");
	const markdownPath = markdownRepresentations.get(pathname);
	const targetPath =
		acceptsMarkdown && markdownPath
			? markdownPath
			: (staticAliases.get(pathname) ?? pathname);
	url.pathname = targetPath;
	url.search = "";
	const targetUrl = url;
	const response = await env.ASSETS.fetch(
		new Request(targetUrl, {
			method: request.method,
			headers: request.headers,
		}),
	);

	const isApiPath =
		pathname === "/api" ||
		pathname === "/api/v1" ||
		pathname.startsWith("/api/") ||
		pathname.startsWith("/api/v1/");
	if (isApiPath && response.status === 404) {
		return withHeaders(
			new Response(
				`${JSON.stringify(
					{
						type: "https://gildrb.com/api-docs.md#errors",
						title: "Not Found",
						status: 404,
						detail:
							"Unknown API resource. See https://gildrb.com/api-docs.md for available endpoints.",
						instance: pathname,
					},
					null,
					2,
				)}\n`,
				{
					status: 404,
					headers: {
						"Cache-Control": "no-store",
						"Content-Type": "application/problem+json; charset=utf-8",
					},
				},
			),
			API_RESPONSE_HEADERS,
		);
	}

	if (acceptsMarkdown && markdownPath) {
		return withHeaders(response, {
			"Content-Type": "text/markdown; charset=utf-8",
			Vary: "Accept",
		});
	}
	if (pathname === "/api/profile" || pathname === "/api/v1/profile") {
		return withHeaders(response, {
			...API_RESPONSE_HEADERS,
			"Content-Type": "application/ld+json; charset=utf-8",
		});
	}
	if (pathname === "/mcp/server-card") {
		return withHeaders(response, {
			"Access-Control-Allow-Origin": "*",
			"Cache-Control": "public, max-age=3600",
			"Content-Type": "application/mcp-server-card+json; charset=utf-8",
		});
	}
	return response;
}
