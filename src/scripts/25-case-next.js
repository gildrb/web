const caseNext = document.querySelector(".case-next");

if (caseNext) {
    const links = [...caseNext.querySelectorAll(".case-next-link")];
    const currentSlug = caseNext.dataset.caseSlug;
    const visitedKey = "gildrb:visited-cases";
    let visited = [];

    try {
        const saved = JSON.parse(localStorage.getItem(visitedKey) || "[]");
        if (Array.isArray(saved)) {
            visited = saved.filter((slug) => typeof slug === "string");
        }
    } catch {
        visited = [];
    }

    if (currentSlug && !visited.includes(currentSlug)) {
        visited.push(currentSlug);
    }

    try {
        localStorage.setItem(visitedKey, JSON.stringify(visited));
    } catch {
        visited = [];
    }

    const candidates = links.filter(
        (link) => link.getAttribute("href") !== `/${currentSlug}`,
    );
    const unvisited = candidates.filter(
        (link) => !visited.includes(link.getAttribute("href").slice(1)),
    );
    const alreadyVisited = candidates.filter((link) =>
        visited.includes(link.getAttribute("href").slice(1)),
    );
    const prioritizeUnvisited = true;
    const groups = prioritizeUnvisited
        ? [unvisited, alreadyVisited]
        : [alreadyVisited, unvisited];
    const selected = [];

    for (const group of groups) {
        for (let index = group.length - 1; index > 0; index -= 1) {
            const randomIndex = Math.floor(Math.random() * (index + 1));
            [group[index], group[randomIndex]] = [
                group[randomIndex],
                group[index],
            ];
        }
        selected.push(...group);
    }

    const visible = new Set(selected.slice(0, 3));
    for (const link of links) {
        link.hidden = !visible.has(link);
    }
}
