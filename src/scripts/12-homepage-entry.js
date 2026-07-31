const homepageEntryRoot = document.documentElement;
const finalHomepageEntryElement = document.querySelector(
    ".links > .contact-label ~ .external-link:last-child",
);
let homepageEntryFallback;
let homepageReloadBypass = false;

function finishHomepageEntry() {
    homepageEntryRoot.dataset.homepageEntryComplete = "true";
    window.clearTimeout(homepageEntryFallback);
}

function waitForHomepageReloadPaint() {
    return new Promise((resolve) => {
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(resolve);
        });
    });
}

if ("navigation" in window) {
    window.navigation.addEventListener("navigate", (event) => {
        if (event.navigationType !== "reload" || !event.canIntercept) return;

        if (homepageReloadBypass) {
            homepageReloadBypass = false;
            return;
        }

        event.intercept({
            scroll: "manual",
            async handler() {
                homepageEntryRoot.dataset.homepageReloadPreparing = "true";
                await waitForHomepageReloadPaint();

                homepageReloadBypass = true;
                window.location.reload();
            },
        });
    });
}

if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    finishHomepageEntry();
} else {
    finalHomepageEntryElement?.addEventListener(
        "animationend",
        (event) => {
            if (event.animationName === "homepage-enter") {
                finishHomepageEntry();
            }
        },
        { once: true },
    );
    homepageEntryFallback = window.setTimeout(finishHomepageEntry, 2800);
}
