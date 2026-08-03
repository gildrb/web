import { siteConfig } from "./site-config.mjs";

const baseUrl = new URL(process.env.CRAWL_BASE_URL ?? "https://gildrb.com");
const canonicalOrigin = "https://gildrb.com";
const brandDescription =
    "Brand designer based in Germany, building identity systems for software.";
const staleRolePatterns = [
    new RegExp(["Product", "designer"].join("\\s+"), "i"),
    new RegExp(`${["design", "engineer"].join("\\s+")}\\b`, "i"),
];
const sharedCacheFreshnessToken = ["s", "maxage"].join("-");
const crawlerUserAgents = Object.freeze([
    "ChatGPT-User",
    "GPTBot",
    "OAI-SearchBot",
    "ClaudeBot",
    "PerplexityBot",
]);
const discoveryRoutes = Object.freeze([
    "/",
    "/llms.txt",
    "/llms-full.txt",
    "/.well-known/llms.txt",
    "/index.html.md",
    "/profile.json",
    "/feed.xml",
    "/humans.txt",
    "/.well-known/webfinger",
    "/robots.txt",
    "/sitemap.xml",
]);
const caseRoutes = Object.freeze(
    siteConfig.caseStudies.map(({ slug }) => `/${slug}`),
);
const caseMarkdownRoutes = Object.freeze(
    siteConfig.caseStudies.map(({ slug }) => `/content/${slug}.md`),
);
const expectedRoutes = Object.freeze([
    ...discoveryRoutes,
    ...caseRoutes,
    ...caseMarkdownRoutes,
]);
const routeExpectations = {
    "/": {
        contentType: "text/html",
        minBytes: 50000,
        indexable: true,
        markers: [
            "<main class=\"content\"",
            "<section\n                        class=\"profile-summary\"",
            "class=\"portfolio-section\"",
            "<footer class=\"site-footer\"",
            brandDescription,
            "Heph local document agent",
            "Ben Davis brandmark",
            "T3 logomark exploration",
            "Filen identity system",
            "n0thing wordmark",
            "CURVES free display typeface",
            "mL7 identity",
            "https://gildrb.com/llms.txt",
            "https://gildrb.com/llms-full.txt",
            "https://gildrb.com/index.html.md",
            "https://gildrb.com/profile.json",
        ],
    },
    "/llms.txt": {
        contentType: "text/markdown",
        minBytes: 3000,
        indexable: true,
        markers: [
            "Canonical LLM reference",
            brandDescription,
            "https://gildrb.com/llms-full.txt",
            "https://gildrb.com/index.html.md",
            "https://gildrb.com/sitemap.xml",
        ],
    },
    "/llms-full.txt": {
        contentType: "text/markdown",
        minBytes: 20000,
        indexable: true,
        markers: [
            "Full Public Text for gildrb.com",
            "This file is generated from the same authored Markdown sources as the website.",
            brandDescription,
            "Markdown source: https://gildrb.com/index.html.md",
            "Markdown source: https://gildrb.com/content/heph.md",
            "## Case Study: Ben Davis",
            "## Case Study: T3",
            "## Case Study: Filen",
            "## Case Study: n0thing",
            "## Case Study: CURVES",
        ],
    },
    "/.well-known/llms.txt": {
        contentType: "text/markdown",
        minBytes: 3000,
        indexable: true,
        markers: [
            "Canonical well-known LLM reference",
            brandDescription,
            "https://gildrb.com/llms.txt",
            "https://gildrb.com/llms-full.txt",
            "https://gildrb.com/sitemap.xml",
        ],
    },
    "/index.html.md": {
        contentType: "text/markdown",
        minBytes: 2500,
        indexable: true,
        markers: [
            "Canonical Markdown version of the homepage",
            "## Identity",
            "## About",
            "## Portfolio",
            brandDescription,
        ],
    },
    "/profile.json": {
        contentType: "application/ld+json",
        minBytes: 10000,
        indexable: true,
        markers: [
            "\"@context\": \"https://schema.org\"",
            brandDescription,
            "https://gildrb.com/llms.txt#reference",
            "https://gildrb.com/index.html.md#homepage-markdown",
        ],
    },
    "/feed.xml": {
        contentType: "application/rss+xml",
        minBytes: 1000,
        indexable: true,
        markers: [
            "<rss version=\"2.0\"",
            brandDescription,
            "<link>https://gildrb.com/</link>",
        ],
    },
    "/humans.txt": {
        contentType: "text/plain",
        minBytes: 1000,
        indexable: true,
        markers: [
            "Gil Rodrigues",
            brandDescription,
            "https://gildrb.com/llms.txt",
        ],
    },
    "/.well-known/webfinger": {
        contentType: "application/jrd+json",
        minBytes: 1000,
        indexable: true,
        markers: [
            "\"subject\": \"acct:gildrb@gildrb.com\"",
            brandDescription,
            "https://gildrb.com/llms.txt",
        ],
    },
    "/robots.txt": {
        contentType: "text/plain",
        minBytes: 1000,
        indexable: false,
        markers: [
            "User-agent: *",
            "Allow: /",
            "Content-Signal: search=yes, ai-input=yes, ai-train=yes",
            "Sitemap: https://gildrb.com/sitemap.xml",
        ],
    },
    "/sitemap.xml": {
        contentType: "application/xml",
        minBytes: 1000,
        indexable: false,
        markers: ["<urlset", "<loc>https://gildrb.com/</loc>"],
    },
};

for (const { slug, title } of siteConfig.caseStudies) {
    routeExpectations[`/${slug}`] = {
        contentType: "text/html",
        minBytes: 30000,
        indexable: true,
        markers: [
            `<title>${title}</title>`,
            "case-article",
            "class=\"case-copy\"",
            "https://gildrb.com/llms.txt",
            "https://gildrb.com/llms-full.txt",
            `https://gildrb.com/content/${slug}.md`,
        ],
    };
    routeExpectations[`/content/${slug}.md`] = {
        contentType: "text/markdown",
        minBytes: 300,
        indexable: true,
        markers: ["# "],
    };
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function routeUrl(route) {
    return new URL(route, baseUrl);
}

function headerIncludes(response, name, expected) {
    return response.headers
        .get(name)
        ?.toLowerCase()
        .includes(expected.toLowerCase());
}

async function fetchText(route, userAgent = "ChatGPT-User") {
    const response = await fetch(routeUrl(route), {
        headers: {
            Accept: [
                "text/html",
                "text/markdown",
                "application/ld+json",
                "application/jrd+json",
                "application/rss+xml",
                "application/xml",
                "text/plain",
                "*/*",
            ].join(", "),
            "User-Agent": userAgent,
        },
        redirect: "follow",
    });
    const text = await response.text();

    return { response, text };
}

function assertContentSignals(route, response) {
    assert(
        headerIncludes(response, "content-signal", "search=yes") &&
            headerIncludes(response, "content-signal", "ai-input=yes"),
        `${route} must advertise search=yes and ai-input=yes Content-Signal headers.`,
    );
}

function assertIndexability(route, response, text) {
    const xRobots = response.headers.get("x-robots-tag") ?? "";
    const metaRobots =
        text.match(
            /<meta\s+name=["']robots["'][^>]*content=["']([^"']+)["']/i,
        )?.[1] ?? "";
    const robotsSignals = `${xRobots}, ${metaRobots}`.toLowerCase();

    assert(
        !/\b(?:noindex|none)\b/.test(robotsSignals),
        `${route} must not send noindex or none robots directives.`,
    );
    assert(
        robotsSignals.includes("index") &&
            robotsSignals.includes("follow"),
        `${route} must advertise index and follow robots directives.`,
    );
}

function assertRoute(route, response, text, expectation) {
    assert(
        response.status === 200,
        `${route} must return HTTP 200, got ${response.status}.`,
    );
    assert(
        response.url === routeUrl(route).href,
        `${route} must not redirect away from its canonical URL; got ${response.url}.`,
    );
    assert(
        headerIncludes(response, "content-type", expectation.contentType),
        `${route} must return ${expectation.contentType}; got ${
            response.headers.get("content-type") ?? "no content-type"
        }.`,
    );
    assert(
        text.length >= expectation.minBytes,
        `${route} body is unexpectedly small: ${text.length} bytes.`,
    );
    assertContentSignals(route, response);
    assert(
        !headerIncludes(response, "cache-control", sharedCacheFreshnessToken),
        `${route} should not advertise shared-cache freshness windows that can preserve stale text.`,
    );

    if (expectation.indexable) {
        assertIndexability(route, response, text);
    }

    for (const marker of expectation.markers) {
        assert(text.includes(marker), `${route} is missing marker: ${marker}`);
    }

    assert(
        staleRolePatterns.every((pattern) => !pattern.test(text)),
        `${route} still contains stale role copy.`,
    );
}

function assertRobotsPolicy(text) {
    assert(!/^Disallow:\s*\/\s*$/im.test(text), "robots.txt blocks all crawling.");

    for (const userAgent of crawlerUserAgents) {
        assert(
            text.includes(`User-agent: ${userAgent}`),
            `robots.txt must explicitly list ${userAgent}.`,
        );
    }
}

function assertSitemap(text) {
    const sitemapListedRoutes = expectedRoutes.filter(
        (value) => !["/robots.txt", "/sitemap.xml"].includes(value),
    );

    for (const route of sitemapListedRoutes) {
        assert(
            text.includes(`<loc>${canonicalOrigin}${route}</loc>`),
            `sitemap.xml must include ${canonicalOrigin}${route}.`,
        );
    }
}

function assertDiscoveryLinks(route, response) {
    const link = response.headers.get("link") ?? "";

    for (const expected of [
        "https://gildrb.com/llms.txt",
        "https://gildrb.com/llms-full.txt",
        "https://gildrb.com/profile.json",
    ]) {
        assert(
            link.includes(expected),
            `${route} Link header must include ${expected}.`,
        );
    }
}

const homepageResponses = await Promise.all(
    crawlerUserAgents.map(async (userAgent) => {
        const result = await fetchText("/", userAgent);
        assertRoute("/", result.response, result.text, routeExpectations["/"]);

        return { userAgent, ...result };
    }),
);
const homepageSize = homepageResponses[0].text.length;
for (const { userAgent, text } of homepageResponses) {
    assert(
        text.length === homepageSize,
        `${userAgent} received a different homepage size: ${text.length} bytes.`,
    );
}
assertDiscoveryLinks("/", homepageResponses[0].response);

const routeResults = await Promise.all(
    expectedRoutes
        .filter((route) => route !== "/")
        .map(async (route) => [route, await fetchText(route)]),
);
const results = new Map([["/", homepageResponses[0]], ...routeResults]);

for (const [route, { response, text }] of results) {
    assertRoute(route, response, text, routeExpectations[route]);
    if (
        [
            "/llms.txt",
            "/llms-full.txt",
            "/index.html.md",
            "/profile.json",
        ].includes(route)
    ) {
        assertDiscoveryLinks(route, response);
    }
}

assertRobotsPolicy(results.get("/robots.txt").text);
assertSitemap(results.get("/sitemap.xml").text);

console.log(
    `Verified crawlability for ${expectedRoutes.length} routes and ${crawlerUserAgents.length} crawler user agents at ${baseUrl.href}.`,
);
