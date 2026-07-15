const sharedCaseScripts = Object.freeze([
    "10-core.js",
    "20-theme.js",
    "30-email.js",
]);

export const siteConfig = Object.freeze({
    analyticsScript: "00-analytics-bootstrap.js",
    profileSource: "src/data/profile.json",
    caseStudies: Object.freeze([
        Object.freeze({
            slug: "filen",
            title: "Filen",
            scripts: sharedCaseScripts,
        }),
        Object.freeze({
            slug: "heph",
            title: "Heph",
            scripts: Object.freeze([
                ...sharedCaseScripts,
                "40-heph-data.js",
                "50-heph-demo.js",
            ]),
        }),
        Object.freeze({
            slug: "ml7",
            title: "mL7",
            scripts: sharedCaseScripts,
        }),
        Object.freeze({
            slug: "n0thing",
            title: "n0thing",
            scripts: sharedCaseScripts,
        }),
        Object.freeze({
            slug: "site",
            title: "This website",
            scripts: sharedCaseScripts,
        }),
    ]),
});
