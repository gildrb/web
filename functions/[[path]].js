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
]);

const staticAliases = new Map([
	["/api/profile", "/profile.json"],
	["/mcp/server-card", "/.well-known/mcp/server-card.json"],
]);

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

	if (acceptsMarkdown && markdownPath) {
		return withHeaders(response, {
			"Content-Type": "text/markdown; charset=utf-8",
			Vary: "Accept",
		});
	}
	if (pathname === "/api/profile") {
		return withHeaders(response, {
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
