import { readFile } from "node:fs/promises";

const homepage = await readFile(new URL("../index.html", import.meta.url), "utf8");

const requiredFragments = [
    "@keyframes homepage-enter",
    ".links > .links-label:first-child",
    ".links > .contact-label",
    ".portfolio-table-header",
    ".portfolio-list > .portfolio-card-link:nth-child(1)",
];

const missingFragments = requiredFragments.filter(
    (fragment) => !homepage.includes(fragment),
);

if (missingFragments.length > 0) {
    throw new Error(
        `Generated homepage is missing entry-animation CSS:\n${missingFragments.join("\n")}`,
    );
}

console.log("Generated homepage contains the entry-animation CSS.");
