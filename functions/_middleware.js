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

function problemResponse(pathname, status, title, detail) {
	return new Response(
		`${JSON.stringify(
			{
				type: "https://gildrb.com/api-docs.md#errors",
				title,
				status,
				detail,
				instance: pathname,
			},
			null,
			2,
		)}\n`,
		{
			status,
			headers: {
				"Cache-Control": "no-store",
				"Content-Type": "application/problem+json; charset=utf-8",
				"X-Content-Type-Options": "nosniff",
			},
		},
	);
}

export function onRequest(context) {
	let pathname;
	try {
		pathname = new URL(context.request.url).pathname;
	} catch {
		return problemResponse("/", 400, "Bad Request", "Invalid request URL.");
	}
	const normalized = normalizePathname(pathname);
	const isApiPath =
		normalized !== null &&
		(normalized === "/api" ||
			normalized === "/api/v1" ||
			normalized.startsWith("/api/") ||
			normalized.startsWith("/api/v1/") ||
			normalized === "/mcp");
	if (isApiPath && (normalized === "/api" || normalized === "/api/v1")) {
		return problemResponse(
			normalized,
			404,
			"Not Found",
			"Missing API resource. See https://gildrb.com/api-docs.md for available endpoints.",
		);
	}
	if (
		normalized === null ||
		blockedFiles.has(normalized) ||
		blockedPrefixes.some((prefix) => normalized.startsWith(prefix))
	) {
		if (isApiPath) {
			return problemResponse(
				normalized,
				404,
				"Not Found",
				"Unknown API resource. See https://gildrb.com/api-docs.md for available endpoints.",
			);
		}
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
