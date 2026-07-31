const homepageEntryRoot = document.documentElement;
const finalHomepageEntryElement = document.querySelector(
    ".links > .contact-label ~ .external-link:last-child",
);
let homepageEntryFallback;

function finishHomepageEntry() {
    homepageEntryRoot.dataset.homepageEntryComplete = "true";
    window.clearTimeout(homepageEntryFallback);
}

function prepareHomepageExit() {
    homepageEntryRoot.dataset.homepageEntryExiting = "true";
}

function restoreHomepagePage() {
    delete homepageEntryRoot.dataset.homepageEntryExiting;
}

window.addEventListener("beforeunload", prepareHomepageExit, {
    capture: true,
});
window.addEventListener("pagehide", prepareHomepageExit, {
    capture: true,
});
window.addEventListener("pageshow", restoreHomepagePage, {
    capture: true,
});

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
