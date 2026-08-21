import { cp, mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { siteConfig } from "./site-config.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "public");
const publishedEntries = new Set([
	".well-known",
	"36729bcbe2a8c2d375ce91a993cbc5d4.txt",
	"404.html",
	"_headers",
	"_redirects",
	"_routes.json",
	"about",
	"all",
	"api-docs.md",
	"auth.md",
	"contact",
	"content",
	"developers",
	"content",
	"favicon.svg",
	"feed.xml",
	"fonts",
	"humans.txt",
	"images",
	"index.html",
	"index.html.md",
	"llms-full.txt",
	"llms.txt",
	"openapi.json",
	"preview-favicon.svg",
	"privacy",
	"profile.json",
	"robots.txt",
	"sitemap.xml",
	...siteConfig.caseStudies.map(({ slug }) => slug),
]);

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

await Promise.all(
	[...publishedEntries].map((entry) =>
		cp(path.join(root, entry), path.join(output, entry), {
			recursive: true,
		}),
	),
);

const homepage = await readFile(path.join(output, "index.html"), "utf8");
const homepageByteBudget = 128 * 1024;
if (Buffer.byteLength(homepage) > homepageByteBudget) {
	throw new Error(
		`Exported homepage exceeds its ${homepageByteBudget}-byte uncompressed budget.`,
	);
}
const requiredFragments = [
	'window.localStorage.getItem("theme")',
	"font-display:optional",
	'data-cfasync="false"',
	"<!--email_off-->",
];
const missingFragments = requiredFragments.filter(
	(fragment) => !homepage.includes(fragment),
);

if (missingFragments.length > 0) {
	throw new Error(
		`Exported homepage is missing first-paint stabilization:\n${missingFragments.join("\n")}`,
	);
}

const themeBootstrapIndex = homepage.indexOf(
	'window.localStorage.getItem("theme")',
);
const inlineStyleIndex = homepage.indexOf("<style>");

if (
	themeBootstrapIndex < 0 ||
	inlineStyleIndex < 0 ||
	themeBootstrapIndex > inlineStyleIndex
) {
	throw new Error(
		"Saved theme must be resolved before the homepage CSS is parsed.",
	);
}

const rejectedFragments = [
	"font-display:swap",
	"homepage-first-paint-pending",
	"document.fonts.load('400 16px \"Inter\"')",
	'IoskeleyMono-Regular.woff2" as="font',
	"gildrb-homepage-entry-seen",
	'window.addEventListener("beforeunload", prepareHomepageExit',
	'window.addEventListener("pagehide", prepareHomepageExit',
	'event.navigationType !== "reload"',
	"event.intercept({",
];
const presentRejectedFragments = rejectedFragments.filter((fragment) =>
	homepage.includes(fragment),
);

if (presentRejectedFragments.length > 0) {
	throw new Error(
		`Exported homepage contains superseded first-paint behavior:\n${presentRejectedFragments.join("\n")}`,
	);
}

console.log(
	`Prepared ${publishedEntries.size} allowlisted entries for Cloudflare Pages without render gates or unused font preloads.`,
);
