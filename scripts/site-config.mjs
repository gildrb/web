const sharedCaseScripts = Object.freeze([
    "10-core.js",
    "20-theme.js",
    "30-email.js",
]);

const sharedCaseStyles = Object.freeze([
    "00-fonts.css",
    "10-base.css",
    "40-preview-content.css",
    "50-case-study.css",
    "90-responsive.css",
]);

export const siteConfig = Object.freeze({
    analyticsScript: "00-analytics-bootstrap.js",
    profileSource: "src/data/profile.json",
    homepage: Object.freeze({
        styles: Object.freeze([
            "00-fonts.css",
            "10-base.css",
            "20-portfolio-media.css",
            "40-preview-content.css",
            "90-responsive.css",
        ]),
        scripts: Object.freeze([
            "10-core.js",
            "15-portfolio-sort.js",
            "20-theme.js",
            "30-email.js",
            "70-links-navigation.js",
        ]),
    }),
    caseStudies: Object.freeze([
        Object.freeze({
            slug: "filen",
            title: "Filen",
            styles: sharedCaseStyles,
            scripts: sharedCaseScripts,
        }),
        Object.freeze({
            slug: "heph",
            title: "Heph",
            styles: Object.freeze([
                "00-fonts.css",
                "10-base.css",
                "30-heph-demo.css",
                "40-preview-content.css",
                "50-case-study.css",
                "90-responsive.css",
            ]),
            scripts: Object.freeze([
                ...sharedCaseScripts,
                "40-heph-data.js",
                "50-heph-demo.js",
            ]),
        }),
        Object.freeze({
            slug: "ml7",
            title: "mL7",
            styles: sharedCaseStyles,
            scripts: sharedCaseScripts,
        }),
        Object.freeze({
            slug: "n0thing",
            title: "n0thing",
            styles: sharedCaseStyles,
            scripts: sharedCaseScripts,
        }),
        Object.freeze({
            slug: "site",
            title: "gildrb.com",
            styles: sharedCaseStyles,
            scripts: sharedCaseScripts,
        }),
    ]),
});
