function getTheme() {
    const selectedTheme = document.documentElement.dataset.theme;

    if (selectedTheme === "dark" || selectedTheme === "light") {
        return selectedTheme;
    }

    return themePreference.matches ? "dark" : "light";
}

function updateThemeToggle() {
    const theme = getTheme();
    const nextTheme = theme === "dark" ? "light" : "dark";
    const label = `Switch to ${nextTheme} mode`;

    themeToggle.setAttribute("aria-label", label);
    themeToggle.title = label;
}

function getSavedTheme() {
    try {
        return localStorage.getItem("theme");
    } catch {
        return null;
    }
}

function saveTheme(theme) {
    try {
        localStorage.setItem("theme", theme);
    } catch {
        return;
    }
}

function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    saveTheme(theme);
    updateThemeToggle();
}

const savedTheme = getSavedTheme();
if (savedTheme === "dark" || savedTheme === "light") {
    document.documentElement.dataset.theme = savedTheme;
}

updateThemeToggle();

let themeToggleUsedPointer = false;
let themeToggleSkipClick = false;
let themeToggleSkipClickTimer;
let themeToggleTouchStartedInside = false;

themeToggle.addEventListener("pointerdown", (event) => {
    themeToggleUsedPointer =
        event.pointerType === "mouse" ||
        event.pointerType === "pen";
});

themeToggle.addEventListener("pointerleave", () => {
    themeToggle.classList.remove("hover-suppressed");
});

themePreference.addEventListener("change", () => {
    if (!document.documentElement.dataset.theme) {
        updateThemeToggle();
    }
});

function toggleTheme() {
    const nextTheme = getTheme() === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    trackEvent("Theme Toggle", { theme: nextTheme });

    if (themeToggleUsedPointer) {
        themeToggle.classList.add("hover-suppressed");
        themeToggle.blur();
    }

    themeToggleUsedPointer = false;
    announce(`Switched to ${nextTheme} mode`);
}

function suppressNextTouchClick() {
    themeToggleSkipClick = true;
    clearTimeout(themeToggleSkipClickTimer);
    themeToggleSkipClickTimer = setTimeout(() => {
        themeToggleSkipClick = false;
    }, 500);
}

function isInsideTouchReleaseArea(event) {
    const rect = themeToggle.getBoundingClientRect();
    const touchReleasePadding = 11;
    const top = Math.max(rect.top, 0);
    const bottom = Math.max(rect.bottom, top + rect.height);

    return (
        event.clientX >= rect.left - touchReleasePadding &&
        event.clientX <= rect.right + touchReleasePadding &&
        event.clientY >= top - touchReleasePadding &&
        event.clientY <= bottom + touchReleasePadding
    );
}

document.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "touch") {
        themeToggleTouchStartedInside = isInsideTouchReleaseArea(event);
    }
}, true);

document.addEventListener("pointerup", (event) => {
    if (event.pointerType === "touch") {
        const shouldToggle =
            themeToggleTouchStartedInside &&
            isInsideTouchReleaseArea(event);
        themeToggleTouchStartedInside = false;
        suppressNextTouchClick();

        if (shouldToggle) {
            toggleTheme();
        }
    }
}, true);

document.addEventListener("pointercancel", () => {
    themeToggleTouchStartedInside = false;
}, true);

themeToggle.addEventListener("click", () => {
    if (themeToggleSkipClick) {
        themeToggleSkipClick = false;
        clearTimeout(themeToggleSkipClickTimer);
        return;
    }

    toggleTheme();
});
