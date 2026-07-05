document.querySelectorAll(".external-link").forEach((link) => {
    link.addEventListener("click", () => {
        trackEvent("External Link Click", {
            destination: link.textContent.trim(),
        });
    });
});

// Disable right-click on all images
document.querySelectorAll("img").forEach((img) => {
    img.addEventListener("contextmenu", (e) => e.preventDefault());
});

// Arrow key navigation
function getArrowNavigationItems() {
    return [
        ...document.querySelectorAll(
            ".links a[href], .links button:not([disabled])",
        ),
        themeToggle,
        ...document.querySelectorAll(
            "main a[href], main button:not([disabled]), main input:not([disabled])",
        ),
    ].filter(
        (item) =>
            item &&
            item.tabIndex >= 0 &&
            !item.closest("[aria-hidden='true']"),
    );
}

document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !imagePreview.hidden) {
        e.preventDefault();
        closeImagePreview();
        return;
    }

    if (!imagePreview.hidden) return;

    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;

    e.preventDefault();

    const activeElement = document.activeElement;
    const arrowNavigationItems = getArrowNavigationItems();
    const currentIndex = arrowNavigationItems.indexOf(activeElement);

    if (currentIndex === -1) {
        arrowNavigationItems[0]?.focus();
        return;
    }

    let nextIndex;
    if (e.key === "ArrowDown") {
        nextIndex =
            (currentIndex + 1) % arrowNavigationItems.length;
    } else {
        nextIndex =
            (currentIndex - 1 + arrowNavigationItems.length) %
            arrowNavigationItems.length;
    }

    arrowNavigationItems[nextIndex].focus();
});
