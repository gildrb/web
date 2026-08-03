const srOnly = document.querySelector(".sr-only");
const themeToggle = document.querySelector(".theme-toggle");
const themePreference = window.matchMedia(
    "(prefers-color-scheme: dark)",
);
const scrollPositionKey = `gildrb:scroll:${window.location.pathname}${window.location.search}`;
const navigationType = window.performance
    .getEntriesByType("navigation")[0]?.type;

function updateHomepageDates() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = String(now.getFullYear());
    const isoDate = `${year}-${month}-${day}`;
    const portfolioSiteDate = document.querySelector("#portfolio-site-date");

    if (!portfolioSiteDate) return;

    portfolioSiteDate.querySelector(".portfolio-date-full").textContent =
        isoDate;
    portfolioSiteDate.querySelector(".portfolio-date-year").textContent =
        year;
    portfolioSiteDate.setAttribute("datetime", isoDate);
}

const mobileLinks = document.querySelector(
    ".case-page .case-mobile-links .links, body:not(.case-page) .links",
);

function updateMobileLinksLayout() {
    const links = mobileLinks;
    const portfolioScope = document.querySelector(".portfolio-sort-scope");
    if (!links) return;

    if (!window.matchMedia("(max-width: 767px)").matches) {
        links.classList.remove("mobile-links-grid");
        links.style.removeProperty("--mobile-contact-start");
        return;
    }

    links.classList.add("mobile-links-grid");
    if (!portfolioScope) return;

    const start =
        portfolioScope.getBoundingClientRect().left -
        links.getBoundingClientRect().left;
    links.style.setProperty(
        "--mobile-contact-start",
        `${Math.max(0, start)}px`,
    );
}

function updateMobileLayout() {
    updateMobileLinksLayout();
}

function updateStickyHeaderFade() {
    document.documentElement.classList.toggle(
        "has-sticky-header-fade",
        window.scrollY > 0,
    );
}

const portfolioSiteDate = document.querySelector("#portfolio-site-date");

async function prepareHomepageFirstPaint() {
    const root = document.documentElement;
    const body = document.body;

    if (!body || body.classList.contains("case-page")) {
        root.classList.remove("homepage-first-paint-pending");
        return;
    }

    updateHomepageDates();
    updateMobileLayout();

    if (document.fonts?.load) {
        try {
            await document.fonts.load('400 16px "Inter"');
        } catch {
            // Continue with the metric-compatible system fallback.
        }
    }

    updateHomepageDates();
    updateMobileLayout();
}

window.homepageFirstPaintReady = prepareHomepageFirstPaint();

window.addEventListener("load", () => {
    updateHomepageDates();
    updateMobileLayout();
});
window.addEventListener("scroll", updateStickyHeaderFade, {
    passive: true,
});
window.addEventListener("resize", () => {
    updateMobileLayout();
    updateStickyHeaderFade();
});
updateStickyHeaderFade();

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
        updateStickyHeaderFade();
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
        updateStickyHeaderFade();
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
