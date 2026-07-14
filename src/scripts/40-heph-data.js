const hephDemoEvidenceOpen = document.querySelector(
    "[data-heph-demo-evidence-open]",
);
const hephDemoEvidenceItems = document.querySelectorAll(
    ".heph-demo-evidence-item",
);
const hephDemoEvidenceControls = document.querySelectorAll(
    ".heph-demo-evidence-item, .heph-demo-citation-button",
);
const hephDemoEvidenceMeta = document.querySelector(
    ".heph-demo-evidence-meta",
);
const hephDemoCommandRow = document.querySelector(
    ".heph-demo-command-row",
);
const hephDemoDefaultCommandRow =
    hephDemoCommandRow?.innerHTML || "";
const hephDemoStatus = document.querySelector(
    "[data-heph-demo-status]",
);
const hephDemoStatusOptionalItems = document.querySelectorAll(
    "[data-heph-demo-status-optional]",
);
const hephDemoMaterials = [
    {
        id: "E1",
        title: "@alice-adventures-wonderland.epub",
        book: "Alice's Adventures in Wonderland",
        file: "alice-adventures-wonderland.epub",
        sourceRef: "materials/alice-adventures-wonderland.epub",
        sourceLabel: "E1 @alice-adventures-wonderland.epub",
        support: "dream logic, wordplay, strange rules",
        gist:
            "Alice follows curiosity into a world where language, manners, authority, and logic keep changing shape.",
        excerpt:
            'page 2, Chapter I: "she had never before seen a rabbit with either a waistcoat-pocket, or a watch to take out of it"',
        detail:
            'PAGE 2, Chapter I | RECEIPT: "she had never before seen a rabbit with either a waistcoat-pocket, or a watch to take out of it"',
        keywords: [
            "alice",
            "wonderland",
            "rabbit",
            "dream",
            "dreamlike",
            "curiosity",
            "rules",
            "nonsense",
            "wordplay",
        ],
        answers: [
            [
                "Alice is a dreamlike trip governed by games of language, size, etiquette, and authority. The rules keep changing as she moves ",
                { evidenceId: "E1" },
                ".",
            ],
            [
                "Alice works because the nonsense has pressure behind it: she is curious, confused, and constantly forced to decide whether a rule deserves to be followed ",
                { evidenceId: "E1" },
                ".",
            ],
            [
                "For dream logic, Alice is the strongest source here. It starts with curiosity and keeps turning ordinary rules into riddles ",
                { evidenceId: "E1" },
                ".",
            ],
        ],
    },
    {
        id: "E2",
        title: "@frankenstein.pdf",
        book: "Frankenstein",
        file: "frankenstein.pdf",
        sourceRef: "materials/frankenstein.pdf",
        sourceLabel: "E2 @frankenstein.pdf",
        support: "creation, abandonment, revenge",
        gist:
            "Victor creates life, rejects what he made, and the damage spreads through isolation, grief, and revenge.",
        excerpt:
            'page 43, Chapter V: "I saw the dull yellow eye of the creature open;"',
        detail:
            'PAGE 43, Chapter V | RECEIPT: "I saw the dull yellow eye of the creature open;"',
        keywords: [
            "frankenstein",
            "victor",
            "creature",
            "creation",
            "creator",
            "ambition",
            "responsibility",
            "abandonment",
            "revenge",
            "duty",
        ],
        answers: [
            [
                "Frankenstein is about creation without care. Victor's ambition matters, but the painful part is what follows: he abandons the life he made and then lives with the consequences ",
                { evidenceId: "E2" },
                ".",
            ],
            [
                "Frankenstein turns responsibility into a gothic problem. The Creature proves Victor's genius and exposes his refusal to accept the obligations of making ",
                { evidenceId: "E2" },
                ".",
            ],
            [
                "For responsibility, I would lean on Frankenstein. The story keeps returning to a simple failure: Victor can make life, but he cannot face caring for it ",
                { evidenceId: "E2" },
                ".",
            ],
        ],
    },
    {
        id: "E3",
        title: "@sherlock-holmes-adventures.epub",
        book: "The Adventures of Sherlock Holmes",
        file: "sherlock-holmes-adventures.epub",
        sourceRef: "materials/sherlock-holmes-adventures.epub",
        sourceLabel: "E3 @sherlock-holmes-adventures.epub",
        support: "cases, observation, inference",
        gist:
            "The stories turn small clues into explanations as Holmes reads people, rooms, habits, and contradictions.",
        excerpt:
            'page 6, A Scandal in Bohemia: "You see, but you do not observe."',
        detail:
            'PAGE 6, A Scandal in Bohemia | RECEIPT: "You see, but you do not observe."',
        keywords: [
            "sherlock",
            "holmes",
            "detective",
            "case",
            "method",
            "observation",
            "observe",
            "inference",
            "reasoning",
            "clue",
        ],
        answers: [
            [
                "Holmes is about observation becoming method. The stories make small details useful: a habit, a stain, a disguise, or a missing fact can reopen the whole case ",
                { evidenceId: "E3" },
                ".",
            ],
            [
                "For reasoning, Holmes is the cleanest source. He turns details other people ignore into evidence that can be checked ",
                { evidenceId: "E3" },
                ".",
            ],
            [
                "The Holmes pattern is simple and satisfying: notice what other people skipped, test what it could mean, then make the hidden story legible ",
                { evidenceId: "E3" },
                ".",
            ],
        ],
    },
    {
        id: "E4",
        title: "@dracula.pdf",
        book: "Dracula",
        file: "dracula.pdf",
        sourceRef: "materials/dracula.pdf",
        sourceLabel: "E4 @dracula.pdf",
        support: "journals, letters, pursuit, gothic threat",
        gist:
            "The book uses records, diaries, letters, and pursuit to turn private fear into a coordinated fight against Dracula.",
        excerpt:
            'page 1, Chapter I: "not able to light on any map or work giving the exact locality of the Castle Dracula"',
        detail:
            'PAGE 1, Chapter I | RECEIPT: "not able to light on any map or work giving the exact locality of the Castle Dracula"',
        keywords: [
            "dracula",
            "vampire",
            "harker",
            "journal",
            "journals",
            "diary",
            "diaries",
            "letters",
            "records",
            "gothic",
            "horror",
            "pursuit",
        ],
        answers: [
            [
                "Dracula is horror told through records. Diaries, letters, logs, and medical notes let the characters compare what they know and coordinate the hunt ",
                { evidenceId: "E4" },
                ".",
            ],
            [
                "Dracula feels gothic, but it is also deeply procedural. The characters survive by writing things down, sharing them, and turning fear into a plan ",
                { evidenceId: "E4" },
                ".",
            ],
            [
                "For Dracula, the form matters as much as the monster. The book reads like a case file for a supernatural threat ",
                { evidenceId: "E4" },
                ".",
            ],
        ],
    },
];
const hephDemoOverviewAnswers = [
    [
        "This armory has four classics. Alice is a dreamlike trip through rules that keep changing ",
        { evidenceId: "E1" },
        ". Frankenstein is ambition turning into responsibility after Victor brings the Creature to life and rejects him ",
        { evidenceId: "E2" },
        ". Sherlock Holmes follows a method: observe the small detail, test it, then explain the case ",
        { evidenceId: "E3" },
        ". Dracula is built from diaries, letters, and records as people compare notes and hunt the Count ",
        { evidenceId: "E4" },
        ".",
    ],
    [
        "Read together, the books are about how people make sense of the impossible. Alice keeps asking what the rules are ",
        { evidenceId: "E1" },
        ". Victor learns that creating life and caring for it are entirely different responsibilities ",
        { evidenceId: "E2" },
        ". Holmes makes hidden facts readable ",
        { evidenceId: "E3" },
        ". Dracula's hunters survive by turning private fear into shared evidence ",
        { evidenceId: "E4" },
        ".",
    ],
    [
        "The short version: Alice follows dreamlike rules ",
        { evidenceId: "E1" },
        ", Frankenstein is creation without care ",
        { evidenceId: "E2" },
        ", Holmes is careful observation turned into casework ",
        { evidenceId: "E3" },
        ", and Dracula is horror organized through documents ",
        { evidenceId: "E4" },
        ".",
    ],
];
const hephDemoFollowUpAnswers = [
    [
        "Comparisons stay scoped to the relevant files. Responsibility points to Frankenstein ",
        { evidenceId: "E2" },
        "; observation points to Holmes ",
        { evidenceId: "E3" },
        ".",
    ],
    [
        "The active set controls the answer. Once Dracula is disabled in /materials, the diary-and-letter evidence drops out ",
        { evidenceId: "E4" },
        ".",
    ],
    [
        "/evidence keeps the passages behind the citations attached, so the answer can stay short while the source trail remains inspectable.",
    ],
    [
        "A clean reading path is Alice for rule-breaking ",
        { evidenceId: "E1" },
        ", Holmes for rule-making ",
        { evidenceId: "E3" },
        ", then Frankenstein and Dracula for what happens when the strange becomes dangerous ",
        { evidenceId: "E2" },
        " ",
        { evidenceId: "E4" },
        ".",
    ],
    [
        "The files stay local in materials/. The index only decides which passages are relevant for the current question; /evidence lets you inspect what was used.",
    ],
];
const hephDemoNarrowFollowUpBuilders = [
    (material) => [
        "The citation opens the file, page, and receipt behind this answer ",
        { evidenceId: material.id },
        ".",
    ],
    (material) => [
        "I am only using ",
        material.file,
        " because this answer is grounded there ",
        { evidenceId: material.id },
        ".",
    ],
    (material) => [
        "A comparison can bring in another book. This turn is grounded in ",
        material.file,
        " ",
        { evidenceId: material.id },
        ".",
    ],
];
const hephDemoRandomItemHistory = new WeakMap();
