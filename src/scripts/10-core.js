const srOnly = document.querySelector(".sr-only");
const themeToggle = document.querySelector(".theme-toggle");
const themePreference = window.matchMedia(
    "(prefers-color-scheme: dark)",
);
const scrollPositionKey = `gildrb:scroll:${window.location.pathname}${window.location.search}`;
const navigationType = window.performance
    .getEntriesByType("navigation")[0]?.type;

if ("scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
}

function saveScrollPosition() {
    try {
        window.sessionStorage.setItem(
            scrollPositionKey,
            JSON.stringify({ left: window.scrollX, top: window.scrollY }),
        );
    } catch {
        return;
    }
}

function restoreScrollPosition(event) {
    if (!event.persisted && navigationType !== "back_forward") return;

    let position;
    try {
        position = JSON.parse(
            window.sessionStorage.getItem(scrollPositionKey),
        );
    } catch {
        return;
    }
    if (!position) return;

    const restore = () => {
        window.scrollTo(position.left, position.top);
    };
    restore();
    window.requestAnimationFrame(() => {
        restore();
        window.requestAnimationFrame(restore);
    });
}

window.addEventListener("pagehide", saveScrollPosition);
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") saveScrollPosition();
});
window.addEventListener("pageshow", restoreScrollPosition);

document.querySelectorAll('a[href="#top"]').forEach((link) => {
    link.addEventListener("click", (event) => {
        event.preventDefault();
        window.scrollTo(0, 0);
        history.replaceState(
            null,
            "",
            window.location.href.replace(/#.*$/, ""),
        );
    });
});

function trackEvent(name, data = {}) {
    if (typeof window.va !== "function") return;

    try {
        window.va("event", {
            name,
            data,
        });
    } catch {
        return;
    }
}

function announce(message) {
    srOnly.textContent = message;
    setTimeout(() => {
        srOnly.textContent = "";
    }, 1000);
}
