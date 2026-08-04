const webMcpPages = Object.freeze([
	"site",
	"t3",
	"ben-davis",
	"heph",
	"filen",
	"n0thing",
	"curves",
	"ml7",
]);

const webMcpTools = [
	{
		name: "list_portfolio_pages",
		title: "List portfolio pages",
		description:
			"List Gil Rodrigues's public portfolio pages and Markdown sources.",
		inputSchema: {
			type: "object",
			properties: {},
			additionalProperties: false,
		},
		annotations: { readOnlyHint: true, untrustedContentHint: false },
		execute: async () => ({
			pages: webMcpPages.map((slug) => ({
				slug,
				url: new URL(`/${slug}`, window.location.origin).href,
				markdown: new URL(`/content/${slug}.md`, window.location.origin).href,
			})),
		}),
	},
	{
		name: "open_portfolio_page",
		title: "Open a portfolio page",
		description:
			"Open a selected public portfolio case study in the current tab.",
		inputSchema: {
			type: "object",
			properties: {
				slug: {
					type: "string",
					enum: webMcpPages,
					description: "The portfolio page to open.",
				},
			},
			required: ["slug"],
			additionalProperties: false,
		},
		annotations: { readOnlyHint: false, untrustedContentHint: false },
		execute: async ({ slug }) => {
			if (!webMcpPages.includes(slug)) {
				throw new TypeError(`Unknown portfolio slug: ${String(slug)}`);
			}
			const url = new URL(`/${slug}`, window.location.origin);
			window.location.assign(url);
			return { opened: url.href };
		},
	},
];

const webMcpContext = navigator.modelContext ?? document.modelContext;
if (typeof webMcpContext?.registerTool === "function") {
	const webMcpAbortController = new AbortController();
	window.addEventListener("pagehide", () => webMcpAbortController.abort(), {
		once: true,
	});
	Promise.all(
		webMcpTools.map((tool) =>
			webMcpContext.registerTool(tool, {
				signal: webMcpAbortController.signal,
			}),
		),
	).catch(() => {
		// WebMCP is experimental; the page remains fully usable if registration fails.
	});
} else if (typeof navigator.modelContext?.provideContext === "function") {
	navigator.modelContext.provideContext({ tools: webMcpTools });
}
