const homepageEntryRoot = document.documentElement;

function finishHomepageEntry() {
    homepageEntryRoot.dataset.homepageEntryComplete = "true";
}

if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    finishHomepageEntry();
} else {
    window.setTimeout(finishHomepageEntry, 4400);
}
