const srOnly = document.querySelector(".sr-only");
const themeToggle = document.querySelector(".theme-toggle");
const themePreference = window.matchMedia(
    "(prefers-color-scheme: dark)",
);
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
