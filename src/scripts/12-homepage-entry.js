const homepageEntryRoot = document.documentElement;
const finalHomepageEntryElement = document.querySelector(
    ".links > .contact-label ~ .external-link:last-child",
);
let homepageEntryFallback;

function finishHomepageEntry() {
    homepageEntryRoot.dataset.homepageEntryComplete = "true";
    window.clearTimeout(homepageEntryFallback);
}

function startHomepageEntry() {
    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
    ).matches;

    if (!reducedMotion) {
        finalHomepageEntryElement?.addEventListener(
            "animationend",
            (event) => {
                if (event.animationName === "homepage-enter") {
                    finishHomepageEntry();
                }
            },
            { once: true },
        );
    }

    homepageEntryRoot.dataset.homepageFirstPaintReady = "true";
    homepageEntryRoot.classList.remove("homepage-first-paint-pending");

    if (reducedMotion) {
        finishHomepageEntry();
        return;
    }

    homepageEntryFallback = window.setTimeout(finishHomepageEntry, 2800);
}

Promise.resolve(window.homepageFirstPaintReady)
    .catch(() => undefined)
    .then(startHomepageEntry);
