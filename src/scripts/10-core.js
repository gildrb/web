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

    if (!window.matchMedia("(max-width: 768px)").matches) {
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

let mobileHomepageLockState = "uninitialized";
let mobileHomepageUnlockedHeight = 0;
let mobileHomepageUnlockedContentBottom = 0;

function updateMobileHomepageLock() {
    const root = document.documentElement;
    const body = document.body;
    const isMobile = window.matchMedia("(max-width: 768px)").matches;

    if (!body || body.classList.contains("case-page") || !isMobile) {
        root.classList.remove("mobile-homepage-locked");
        mobileHomepageLockState = "uninitialized";
        return;
    }

    root.classList.remove("mobile-homepage-locked");
    const links = document.querySelector(".links");
    const contentBottom =
        (links?.getBoundingClientRect().bottom ?? 0) + window.scrollY;
    const minimumInset = 32;
    const fits = contentBottom + minimumInset * 2 <= window.innerHeight;
    const atTop = window.scrollY === 0;

    if (mobileHomepageLockState === "locked") {
        if (atTop && fits) {
            root.classList.add("mobile-homepage-locked");
            return;
        }

        mobileHomepageLockState = "unlocked";
        mobileHomepageUnlockedHeight = window.innerHeight;
        mobileHomepageUnlockedContentBottom = contentBottom;
        return;
    }

    if (mobileHomepageLockState === "unlocked") {
        const viewportChanged =
            Math.abs(
                window.innerHeight - mobileHomepageUnlockedHeight,
            ) >= 32;
        const contentShrank =
            mobileHomepageUnlockedContentBottom - contentBottom >= 32;

        if (
            !atTop ||
            (!viewportChanged && !contentShrank) ||
            !fits
        ) {
            return;
        }

        mobileHomepageLockState = "locked";
        root.classList.add("mobile-homepage-locked");
        return;
    }

    if (atTop && fits) {
        mobileHomepageLockState = "locked";
        root.classList.add("mobile-homepage-locked");
        return;
    }

    mobileHomepageLockState = "unlocked";
    mobileHomepageUnlockedHeight = window.innerHeight;
    mobileHomepageUnlockedContentBottom = contentBottom;
}

function updateMobileLayout() {
    updateMobileLinksLayout();
    updateMobileHomepageLock();
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
