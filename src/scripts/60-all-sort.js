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
    ["date", "title", "scope"].includes(allSortKey) &&
    ["ascending", "descending"].includes(allSortDirection)
) {
    const isDescending = allSortDirection === "descending";
    const directionFactor =
        allSortKey === "date"
            ? isDescending
                ? -1
                : 1
            : isDescending
              ? 1
              : -1;
    const cases = [...allCases.querySelectorAll(".all-case")];

    cases.sort((left, right) => {
        const leftValue = left.dataset[allSortKey];
        const rightValue = right.dataset[allSortKey];
        const comparison =
            allSortKey === "date"
                ? leftValue.localeCompare(rightValue)
                : allTitleCollator.compare(leftValue, rightValue);

        if (comparison !== 0 || allSortKey !== "scope") {
            return comparison * directionFactor;
        }

        return (
            allTitleCollator.compare(
                left.dataset.title,
                right.dataset.title,
            ) * directionFactor
        );
    });

    cases.forEach((caseStudy) => allCases.append(caseStudy));
}
