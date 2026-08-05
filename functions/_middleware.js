const blockedFiles = new Set([
	"/.gitignore",
	"/CLOUDFLARE.md",
	"/DNS-AID.md",
	"/LICENSE",
	"/README.md",
	"/package-lock.json",
	"/package.json",
]);
const blockedPrefixes = ["/.wrangler/", "/functions/", "/scripts/", "/src/"];

export function onRequest(context) {
	let pathname;
	try {
		pathname = new URL(context.request.url).pathname;
	} catch {
		return new Response("Invalid request URL\n", { status: 400 });
	}
	if (
		blockedFiles.has(pathname) ||
		blockedPrefixes.some((prefix) => pathname.startsWith(prefix))
	) {
		return new Response("Not found\n", {
			status: 404,
			headers: {
				"Cache-Control": "no-store",
				"Content-Type": "text/plain; charset=utf-8",
				"X-Content-Type-Options": "nosniff",
			},
		});
	}
	return context.next();
}
