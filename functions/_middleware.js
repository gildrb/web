const blockedFiles = new Set([
	"/.gitignore",
	"/CLOUDFLARE.md",
	"/DNS-AID.md",
	"/LICENSE",
	"/README.md",
	"/package-lock.json",
	"/package.json",
]);
const blockedPrefixes = [
	"/.git/",
	"/.wrangler/",
	"/functions/",
	"/node_modules/",
	"/public/",
	"/scripts/",
	"/src/",
];

function normalizePathname(pathname) {
	let decoded;
	try {
		decoded = decodeURIComponent(pathname);
	} catch {
		return null;
	}
	const segments = [];
	for (const segment of decoded.split("/")) {
		if (segment === "." || segment === "") {
			continue;
		}
		if (segment === "..") {
			segments.pop();
		} else {
			segments.push(segment);
		}
	}
	return `/${segments.join("/")}`;
}

export function onRequest(context) {
	let pathname;
	try {
		pathname = new URL(context.request.url).pathname;
	} catch {
		return new Response("Invalid request URL\n", { status: 400 });
	}
	const normalized = normalizePathname(pathname);
	if (
		normalized === null ||
		blockedFiles.has(normalized) ||
		blockedPrefixes.some((prefix) => normalized.startsWith(prefix))
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
