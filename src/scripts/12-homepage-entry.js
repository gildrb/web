const homepageEntryRoot = document.documentElement;
const finalHomepageEntryElement = document.querySelector(
    ".links > .contact-label ~ .external-link:last-child",
);
let homepageEntryFallback;

function finishHomepageEntry() {
    homepageEntryRoot.dataset.homepageEntryComplete = "true";
    window.clearTimeout(homepageEntryFallback);
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
    homepageEntryFallback = window.setTimeout(finishHomepageEntry, 3600);
}
