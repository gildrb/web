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

themeToggle.addEventListener("click", () => {
    const nextTheme = getTheme() === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    trackEvent("Theme Toggle", { theme: nextTheme });

    if (themeToggleUsedPointer) {
        themeToggle.classList.add("hover-suppressed");
        themeToggle.blur();
    }

    themeToggleUsedPointer = false;
    announce(`Switched to ${nextTheme} mode`);
});
