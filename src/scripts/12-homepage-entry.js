const homepageEntryRoot = document.documentElement;
const homepageEntryClass = "homepage-entry";

function finishHomepageEntry() {
    homepageEntryRoot.classList.remove(homepageEntryClass);
}

if (homepageEntryRoot.classList.contains(homepageEntryClass)) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        finishHomepageEntry();
    } else {
        window.setTimeout(finishHomepageEntry, 4400);
    }
}
