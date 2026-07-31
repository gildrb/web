const portfolioSortButtons = document.querySelectorAll(
    ".portfolio-sort-button",
);
const portfolioList = document.querySelector(".portfolio-list");
const portfolioAllLink = document.querySelector(".portfolio-link-heading");
const titleCollator = new Intl.Collator("en", {
    numeric: true,
    sensitivity: "base",
});

function getPortfolioRowValue(row, key) {
    if (key === "date") {
        return row.querySelector("time").getAttribute("datetime");
    }

    return row
        .querySelector(`.portfolio-card-${key}`)
        .textContent.trim();
}

function getSortDirectionFactor(key, direction) {
    const isDescending = direction === "descending";

    if (key === "date") {
        return isDescending ? -1 : 1;
    }

    return isDescending ? 1 : -1;
}

function sortPortfolioRows(key, direction) {
    const directionFactor = getSortDirectionFactor(key, direction);
    const rows = [
        ...portfolioList.querySelectorAll(".portfolio-card-link"),
    ];

    rows.sort((left, right) => {
        const leftValue = getPortfolioRowValue(left, key);
        const rightValue = getPortfolioRowValue(right, key);
        const comparison =
            key === "date"
                ? leftValue.localeCompare(rightValue)
                : titleCollator.compare(leftValue, rightValue);

        if (comparison !== 0 || key !== "scope") {
            return comparison * directionFactor;
        }

        const leftTitle = getPortfolioRowValue(left, "title");
        const rightTitle = getPortfolioRowValue(right, "title");

        return (
            titleCollator.compare(leftTitle, rightTitle) *
            directionFactor
        );
    });

    rows.forEach((row) => portfolioList.append(row));
}

function updatePortfolioAllLink(key, direction) {
    if (!portfolioAllLink) return;

    portfolioAllLink.href = `/all?sort=${key}&direction=${direction}`;
}

function getSortDescription(key, direction) {
    if (key === "date") {
        return direction === "ascending" ? "oldest first" : "newest first";
    }

    return direction === "descending" ? "A to Z" : "Z to A";
}

portfolioSortButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
        const key = button.dataset.sortKey;
        const currentDirection = button.dataset.sortDirection;
        const isActive = button.getAttribute("aria-pressed") === "true";
        let direction;

        if (isActive) {
            direction =
                currentDirection === "ascending"
                    ? "descending"
                    : "ascending";
        } else {
            direction = "descending";
        }

        const description = getSortDescription(key, direction);

        portfolioSortButtons.forEach((sortButton) => {
            sortButton.setAttribute("aria-pressed", "false");
            sortButton.removeAttribute("data-sort-direction");
            sortButton.setAttribute(
                "aria-label",
                `Sort projects by ${sortButton.dataset.sortKey}`,
            );
        });

        button.setAttribute("aria-pressed", "true");
        button.dataset.sortDirection = direction;
        button.querySelector(".portfolio-sort-indicator").textContent =
            direction === "ascending" ? "↑" : "↓";
        button.setAttribute(
            "aria-label",
            `Sort projects by ${key}, currently ${description}`,
        );

        document.documentElement.classList.remove("homepage-entry");
        sortPortfolioRows(key, direction);
        updatePortfolioAllLink(key, direction);
        announce(`Projects sorted by ${key}, ${description}.`);
        if (event.detail !== 0) button.blur();
    });
});
