const portfolioSortButtons = document.querySelectorAll(
    ".portfolio-sort-button",
);
const portfolioList = document.querySelector(".portfolio-list");
const titleCollator = new Intl.Collator("en", {
    numeric: true,
    sensitivity: "base",
});

function getPortfolioRowValue(row, key) {
    if (key === "date") {
        return row.querySelector("time").getAttribute("datetime");
    }

    return row.querySelector(".portfolio-card-title").textContent.trim();
}

function sortPortfolioRows(key, direction) {
    const directionFactor = direction === "ascending" ? 1 : -1;
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

        return comparison * directionFactor;
    });

    rows.forEach((row) => portfolioList.append(row));
}

function getSortDescription(key, direction) {
    if (key === "date") {
        return direction === "ascending" ? "oldest first" : "newest first";
    }

    return direction === "ascending" ? "A to Z" : "Z to A";
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
            direction = key === "date" ? "descending" : "ascending";
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
        button.setAttribute(
            "aria-label",
            `Sort projects by ${key}, currently ${description}`,
        );
        sortPortfolioRows(key, direction);
        announce(`Projects sorted by ${key}, ${description}.`);
        if (event.detail !== 0) button.blur();
    });
});
