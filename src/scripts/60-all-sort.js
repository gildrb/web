const allCases = document.querySelector(".all-cases");
const allSortParams = new URLSearchParams(window.location.search);
const allSortKey = allSortParams.get("sort");
const allSortDirection = allSortParams.get("direction");
const allTitleCollator = new Intl.Collator("en", {
    numeric: true,
    sensitivity: "base",
});

if (
    allCases &&
    ["date", "title", "field"].includes(allSortKey) &&
    ["ascending", "descending"].includes(allSortDirection)
) {
    const directionFactor = allSortDirection === "ascending" ? 1 : -1;
    const cases = [...allCases.querySelectorAll(".all-case")];

    cases.sort((left, right) => {
        const leftValue = left.dataset[allSortKey];
        const rightValue = right.dataset[allSortKey];
        const comparison =
            allSortKey === "date"
                ? leftValue.localeCompare(rightValue)
                : allTitleCollator.compare(leftValue, rightValue);

        return comparison * directionFactor;
    });

    cases.forEach((caseStudy) => allCases.append(caseStudy));
}
