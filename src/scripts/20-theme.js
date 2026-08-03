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

themeToggle.addEventListener("pointerup", (event) => {
    if (event.pointerType === "touch") {
        suppressNextTouchClick();

        const rect = themeToggle.getBoundingClientRect();
        const hitAreaPadding = 6;
        const insideHitArea =
            event.clientX >= rect.left - hitAreaPadding &&
            event.clientX <= rect.right + hitAreaPadding &&
            event.clientY >= rect.top &&
            event.clientY <= rect.bottom;

        if (insideHitArea) {
            toggleTheme();
        }
    }
});

themeToggle.addEventListener("pointercancel", () => {
    themeToggleSkipClick = false;
});

themeToggle.addEventListener("click", () => {
    if (themeToggleSkipClick) {
        themeToggleSkipClick = false;
        clearTimeout(themeToggleSkipClickTimer);
        return;
    }

    toggleTheme();
});
