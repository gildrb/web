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
    const copyrightYear = document.querySelector("#copyright-year");
    const portfolioSiteDate = document.querySelector("#portfolio-site-date");

    if (copyrightYear) copyrightYear.textContent = year;
    if (!portfolioSiteDate) return;

    portfolioSiteDate.querySelector(".portfolio-date-full").textContent =
        isoDate;
    portfolioSiteDate.querySelector(".portfolio-date-year").textContent =
        year;
    portfolioSiteDate.setAttribute("datetime", isoDate);
}

window.addEventListener("load", updateHomepageDates);

function updateMobileLinksLayout() {
    const links = document.querySelector(".links");
    const portfolioField = document.querySelector(".portfolio-sort-field");
    if (!links || !portfolioField) return;

    if (!window.matchMedia("(max-width: 767px)").matches) {
        links.classList.remove("mobile-links-grid");
        links.style.removeProperty("--mobile-contact-start");
        return;
    }

    const start =
        portfolioField.getBoundingClientRect().left -
        links.getBoundingClientRect().left;
    links.classList.add("mobile-links-grid");
    links.style.setProperty(
        "--mobile-contact-start",
        `${Math.max(0, start)}px`,
    );
}

let homepageLockState = "uninitialized";
let homepageUnlockedHeight = 0;
let homepageUnlockedContentBottom = 0;

function updateHomepageLock() {
    const root = document.documentElement;
    const body = document.body;

    if (!body || body.classList.contains("case-page")) {
        root.classList.remove("homepage-scroll-locked");
        homepageLockState = "uninitialized";
        return;
    }

    root.classList.remove("homepage-scroll-locked");
    const contentBottom = Math.max(
        ...Array.from(
            document.querySelectorAll(
                ".profile-summary, .portfolio-section, .links, .site-footer",
            ),
            (element) =>
                element.getBoundingClientRect().bottom + window.scrollY,
        ),
        0,
    );
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    const minimumInset = isMobile ? 32 : 0;
    const fits = contentBottom + minimumInset * 2 <= window.innerHeight;
    const atTop = window.scrollY === 0;

    if (homepageLockState === "locked") {
        if (atTop && fits) {
            root.classList.add("homepage-scroll-locked");
            return;
        }

        homepageLockState = "unlocked";
        homepageUnlockedHeight = window.innerHeight;
        homepageUnlockedContentBottom = contentBottom;
        return;
    }

    if (homepageLockState === "unlocked") {
        const viewportChanged =
            Math.abs(
                window.innerHeight - homepageUnlockedHeight,
            ) >= 32;
        const contentShrank =
            homepageUnlockedContentBottom - contentBottom >= 32;

        if (
            !atTop ||
            (!viewportChanged && !contentShrank) ||
            !fits
        ) {
            return;
        }

        homepageLockState = "locked";
        root.classList.add("homepage-scroll-locked");
        return;
    }

    if (atTop && fits) {
        homepageLockState = "locked";
        root.classList.add("homepage-scroll-locked");
        return;
    }

    homepageLockState = "unlocked";
    homepageUnlockedHeight = window.innerHeight;
    homepageUnlockedContentBottom = contentBottom;
}

function updateMobileLayout() {
    updateMobileLinksLayout();
    updateHomepageLock();
}

window.addEventListener("load", updateMobileLayout);
window.addEventListener("resize", updateMobileLayout);

const portfolioSection = document.querySelector(".portfolio-section");
const portfolioSiteDate = document.querySelector("#portfolio-site-date");
const mobileLayoutTargets = [
    portfolioSection,
    portfolioSiteDate,
    document.querySelector(".profile-summary"),
    document.querySelector(".links"),
].filter(Boolean);
if ("ResizeObserver" in window) {
    const updateOnResize = new ResizeObserver(() => {
        window.setTimeout(updateMobileLayout, 0);
    });
    mobileLayoutTargets.forEach((target) => updateOnResize.observe(target));
}

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
