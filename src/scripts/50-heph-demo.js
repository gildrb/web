let hephDemoRunId = 0;
let hephDemoRunTimers = [];

function setActiveHephDemoEvidence(item) {
    if (!item) return;

    const evidenceId = item.dataset.evidenceId;

    hephDemoEvidenceItems.forEach((evidenceItem) => {
        evidenceItem.classList.toggle(
            "is-active",
            evidenceItem.dataset.evidenceId === evidenceId,
        );
    });

    if (hephDemoEvidenceOpen) {
        hephDemoEvidenceOpen.textContent = "EVIDENCE ctrl+g";
    }
}

function getHephDemoEvidenceItem(evidenceId) {
    return Array.from(hephDemoEvidenceItems).find(
        (evidenceItem) =>
            evidenceItem.dataset.evidenceId === evidenceId,
    );
}

function setActiveHephDemoEvidenceId(evidenceId) {
    const item = getHephDemoEvidenceItem(evidenceId);
    setActiveHephDemoEvidence(item);
}

function shuffleHephDemoMaterials() {
    return hephDemoMaterials
        .map((material) => ({
            material,
            order: Math.random(),
        }))
        .sort((left, right) => left.order - right.order)
        .map(({ material }) => material);
}

function randomHephDemoItem(items) {
    if (items.length <= 1) {
        return items[0];
    }

    const previousIndex = hephDemoRandomItemHistory.get(items);
    let nextIndex = Math.floor(Math.random() * items.length);

    if (nextIndex === previousIndex) {
        nextIndex = (nextIndex + 1) % items.length;
    }

    hephDemoRandomItemHistory.set(items, nextIndex);

    return items[nextIndex];
}

function findHephDemoMaterialForPrompt(prompt) {
    const normalizedPrompt = prompt.toLowerCase();

    return hephDemoMaterials.find((material) =>
        material.keywords.some((keyword) =>
            normalizedPrompt.includes(keyword),
        ),
    );
}

function hephDemoPromptWantsSources(prompt) {
    return (
        /^\/materials\b/i.test(prompt) ||
        /\b(evidence|source|sources|citation|citations|file|files)\b/i.test(
            prompt,
        ) ||
        /\b(which|list|show|open)\s+materials\b/i.test(prompt) ||
        /\bmaterials\s+(used|enabled|source|sources)\b/i.test(
            prompt,
        )
    );
}

function getHephDemoMaterialsForPrompt(prompt) {
    const promptMaterial = findHephDemoMaterialForPrompt(prompt);

    if (promptMaterial && !hephDemoPromptWantsSources(prompt)) {
        return [promptMaterial];
    }

    return shuffleHephDemoMaterials();
}

function buildHephDemoResponseLines(prompt) {
    const promptMaterial = findHephDemoMaterialForPrompt(prompt);

    if (hephDemoPromptWantsSources(prompt)) {
        return [
            [
                "Here is the source map for this turn: E1 is alice-adventures-wonderland.epub ",
                { evidenceId: "E1" },
                ", E2 is frankenstein.pdf ",
                { evidenceId: "E2" },
                ", E3 is sherlock-holmes-adventures.epub ",
                { evidenceId: "E3" },
                ", and E4 is dracula.pdf ",
                { evidenceId: "E4" },
                ". Click any citation to see the file, page, and a short receipt from the source.",
            ],
            randomHephDemoItem(hephDemoFollowUpAnswers),
        ];
    }

    if (promptMaterial) {
        const followUpBuilder = randomHephDemoItem(
            hephDemoNarrowFollowUpBuilders,
        );

        return [
            randomHephDemoItem(promptMaterial.answers),
            followUpBuilder(promptMaterial),
        ];
    }

    return [
        randomHephDemoItem(hephDemoOverviewAnswers),
        randomHephDemoItem(hephDemoFollowUpAnswers),
    ];
}

function clearHephDemoRunTimers() {
    hephDemoRunTimers.forEach((timer) => clearTimeout(timer));
    hephDemoRunTimers = [];
}

function scheduleHephDemoStep(runId, delay, callback) {
    const timer = setTimeout(() => {
        if (runId !== hephDemoRunId) return;
        callback();
    }, delay);

    hephDemoRunTimers.push(timer);
}

function setHephDemoRunning(isRunning) {
    hephDemoInput.readOnly = isRunning;
    hephDemoSubmit.disabled = isRunning;
    hephDemoForm?.classList.toggle("is-running", isRunning);
    syncHephDemoComposerState();

    if (hephDemoEvidenceMeta) {
        hephDemoEvidenceMeta.textContent = "EXCERPTS 4";
    }

    if (hephDemoCommandRow) {
        hephDemoCommandRow.innerHTML = isRunning
            ? "<span>STOP <b>esc</b></span><span>EXIT <b>ctrl+c</b></span>"
            : hephDemoDefaultCommandRow;
    }
}

function openHephDemoEvidence(item, options = {}) {
    const evidenceId = item.dataset.evidenceId;
    if (!evidenceId) return;

    const { addCommandLine = true } = options;
    const evidenceItem = getHephDemoEvidenceItem(evidenceId) || item;
    const title =
        evidenceItem.dataset.evidenceTitle ||
        item.dataset.evidenceTitle ||
        evidenceId;
    const detail =
        evidenceItem.dataset.evidenceDetail ||
        item.dataset.evidenceDetail ||
        "";

    setActiveHephDemoEvidence(evidenceItem);
    hephDemoLog
        .querySelectorAll(".heph-demo-evidence-dynamic")
        .forEach((line) => line.remove());
    if (addCommandLine) {
        appendHephDemoCommandLine(
            `/evidence ${evidenceId} open`,
            "muted heph-demo-evidence-dynamic",
        );
    }
    appendHephDemoLine(
        `OPEN ${title}`,
        "heph-demo-response heph-demo-evidence-dynamic",
    );
    appendHephDemoLine(
        detail,
        "heph-demo-response heph-demo-evidence-dynamic",
    );
    resetHephDemoInput();
    trackEvent("Heph Demo Evidence Open", {
        evidence: evidenceId,
    });
}

function bindHephDemoEvidenceControl(item) {
    item.addEventListener("pointerenter", () =>
        setActiveHephDemoEvidenceId(item.dataset.evidenceId),
    );
    item.addEventListener("focus", () =>
        setActiveHephDemoEvidenceId(item.dataset.evidenceId),
    );
    item.addEventListener("click", (event) => {
        openHephDemoEvidence(item);
        if (event.detail > 0) item.blur();
    });
}

hephDemoEvidenceControls.forEach(bindHephDemoEvidenceControl);

const hephDemoForm = document.querySelector(
    "[data-heph-demo-form]",
);
const hephDemoInput = document.querySelector(
    "[data-heph-demo-input]",
);
const hephDemoSubmit = document.querySelector(
    "[data-heph-demo-submit]",
);
const hephDemoLog = document.querySelector("[data-heph-demo-log]");
const hephDemoRail = document.querySelector(
    "[data-heph-demo-rail]",
);
let hephDemoComposerStateFrame = 0;

function syncHephDemoComposerState() {
    if (!hephDemoForm || !hephDemoInput) return;

    const inputStyle = window.getComputedStyle(hephDemoInput);
    const paddingLeft =
        Number.parseFloat(inputStyle.paddingLeft) || 0;
    const paddingRight =
        Number.parseFloat(inputStyle.paddingRight) || 0;
    const characterWidth =
        paddingLeft ||
        (Number.parseFloat(inputStyle.fontSize) || 1) * 0.6;
    const caretIndex =
        hephDemoInput.selectionStart ?? hephDemoInput.value.length;
    const visibleTextWidth = Math.max(
        0,
        hephDemoInput.clientWidth - paddingLeft - paddingRight,
    );
    const targetScrollLeft = Math.max(
        0,
        caretIndex * characterWidth - visibleTextWidth,
    );

    hephDemoInput.scrollLeft = targetScrollLeft;
    hephDemoForm.classList.toggle(
        "is-empty",
        !hephDemoInput.value,
    );
    hephDemoForm.classList.toggle(
        "has-left-overflow",
        targetScrollLeft > 0,
    );
}

function queueHephDemoComposerStateSync() {
    cancelAnimationFrame(hephDemoComposerStateFrame);
    hephDemoComposerStateFrame = requestAnimationFrame(() => {
        hephDemoComposerStateFrame = 0;
        syncHephDemoComposerState();
    });
}

function resetHephDemoInput() {
    hephDemoInput.value = "";
    hephDemoInput.scrollLeft = 0;
    syncHephDemoComposerState();
}

function scrollHephDemoTranscriptToEnd() {
    if (!hephDemoLog || !hephDemoRail) return;

    const lineHeight = Number.parseFloat(
        window.getComputedStyle(hephDemoRail).lineHeight,
    );
    const rawOffset = Math.max(
        0,
        hephDemoRail.scrollHeight - hephDemoLog.clientHeight,
    );
    let offset = rawOffset;

    if (Number.isFinite(lineHeight) && lineHeight > 0) {
        const railTop =
            hephDemoRail.getBoundingClientRect().top;
        const clipInset = 1;
        let clippedTextBottom = rawOffset;

        for (const child of hephDemoRail.children) {
            const childTop = child.offsetTop;
            const childBottom = childTop + child.offsetHeight;

            if (childBottom < rawOffset) continue;
            if (childTop > rawOffset + lineHeight) break;

            const range = document.createRange();
            range.selectNodeContents(child);

            for (const rect of range.getClientRects()) {
                const rectTop = rect.top - railTop;
                const rectBottom = rect.bottom - railTop;

                if (
                    rectTop < rawOffset + clipInset &&
                    rectBottom > rawOffset + clipInset
                ) {
                    clippedTextBottom = Math.max(
                        clippedTextBottom,
                        rectBottom,
                    );
                }
            }

            range.detach?.();
        }

        if (clippedTextBottom > rawOffset) {
            offset = Math.min(
                rawOffset + lineHeight,
                clippedTextBottom,
            );
        }
    }

    hephDemoLog.scrollTop = 0;
    hephDemoRail.style.setProperty(
        "--heph-demo-scroll-offset",
        `${-offset}px`,
    );
}

function appendHephDemoLine(text, className) {
    const line = document.createElement("p");
    line.className = `heph-demo-line heph-demo-dynamic ${className}`;
    line.textContent = text;
    hephDemoRail?.append(line);
    scrollHephDemoTranscriptToEnd();
}

function createHephDemoCitationButton(evidenceId) {
    const button = document.createElement("button");

    button.className = "heph-demo-citation-button";
    button.type = "button";
    button.tabIndex = -1;
    button.dataset.evidenceId = evidenceId;
    button.textContent = `[${evidenceId}]`;

    bindHephDemoEvidenceControl(button);

    return button;
}

function appendHephDemoCitedLine(parts, className) {
    const line = document.createElement("p");

    line.className = `heph-demo-line heph-demo-dynamic ${className}`;
    parts.forEach((part) => {
        if (typeof part === "string") {
            line.append(part);
            return;
        }

        line.append(createHephDemoCitationButton(part.evidenceId));
    });
    hephDemoRail?.append(line);
    scrollHephDemoTranscriptToEnd();
}

function appendHephDemoCommandLine(command, className) {
    const line = document.createElement("p");
    const arrow = document.createElement("span");

    line.className = `heph-demo-line heph-demo-dynamic ${className}`;
    arrow.className = "heph-demo-command-arrow";
    arrow.textContent = "→";
    line.append(arrow, ` ${command}`);
    hephDemoRail?.append(line);
    scrollHephDemoTranscriptToEnd();
}

function createHephDemoPrompt(prompt) {
    const promptLine = document.createElement("div");
    promptLine.className = "heph-demo-prompt";
    promptLine.textContent = prompt;

    return promptLine;
}

function hephDemoEvidenceIdFromCommand(prompt) {
    const match = prompt.match(/^\/evidence(?:\s+(E[1-4]))?\b/i);

    return match ? match[1]?.toUpperCase() || "" : "";
}

function getActiveHephDemoEvidenceItem() {
    return (
        document.querySelector(".heph-demo-evidence-item.is-active") ||
        getHephDemoEvidenceItem("E1")
    );
}

function runHephDemoEvidenceCommand(prompt) {
    if (!/^\/evidence\b/i.test(prompt)) {
        return false;
    }

    hephDemoRunId += 1;
    clearHephDemoRunTimers();

    const evidenceId = hephDemoEvidenceIdFromCommand(prompt);
    const evidenceItem = evidenceId
        ? getHephDemoEvidenceItem(evidenceId)
        : getActiveHephDemoEvidenceItem();

    hephDemoRail?.append(createHephDemoPrompt(prompt));

    if (!evidenceItem) {
        appendHephDemoLine(
            "No evidence item matched that command. Valid evidence ids are E1, E2, E3, and E4.",
            "heph-demo-response",
        );
        resetHephDemoInput();
        return true;
    }

    openHephDemoEvidence(evidenceItem, { addCommandLine: false });
    return true;
}

const hephDemoResizeObserver =
    "ResizeObserver" in window
        ? new ResizeObserver(() => {
              scrollHephDemoTranscriptToEnd();
          })
        : null;
if (hephDemoLog) hephDemoResizeObserver?.observe(hephDemoLog);
if (hephDemoRail) hephDemoResizeObserver?.observe(hephDemoRail);
document.fonts?.ready
    ?.then(() => {
        scrollHephDemoTranscriptToEnd();
    })
    .catch(() => {});
window.addEventListener("resize", () => {
    scrollHephDemoTranscriptToEnd();
    queueHephDemoComposerStateSync();
});

syncHephDemoComposerState();

function startHephDemoRetrieval(prompt, options = {}) {
    hephDemoRunId += 1;
    clearHephDemoRunTimers();

    const { resetTranscript = false } = options;
    const runId = hephDemoRunId;
    const sampledMaterials = getHephDemoMaterialsForPrompt(prompt);
    const sourceList = sampledMaterials
        .map((material) => material.sourceLabel)
        .join("; ");
    const responseLines =
        buildHephDemoResponseLines(prompt);

    resetHephDemoInput();

    if (resetTranscript) {
        hephDemoRail?.replaceChildren(createHephDemoPrompt(prompt));
    } else {
        hephDemoRail?.append(createHephDemoPrompt(prompt));
    }
    scrollHephDemoTranscriptToEnd();

    setHephDemoRunning(true);

    const steps = [
        {
            text: "Reading enabled materials from classics.",
        },
        {
            text: "Index current: 4 sources.",
        },
        {
            text: "Retrieving evidence for the question.",
        },
        ...sampledMaterials.map((material) => ({
            evidenceId: material.id,
            text: `Retrieved ${material.id} from ${material.sourceRef}: ${material.excerpt}`,
        })),
        {
            text: `Mapped ${sampledMaterials.length} evidence receipts for /evidence.`,
        },
        {
            text: "Writing cited answer.",
        },
        {
            text: "Saved evidence for /evidence.",
        },
        {
            text: "Answer ready.",
        },
    ];

    steps.forEach((step, index) => {
        scheduleHephDemoStep(runId, 140 + index * 150, () => {
            if (step.evidenceId) {
                setActiveHephDemoEvidenceId(step.evidenceId);
            }

            appendHephDemoLine(step.text, "muted");
        });
    });

    const responseDelay = 140 + steps.length * 150 + 120;
    responseLines.forEach((responseLine, index) => {
        scheduleHephDemoStep(
            runId,
            responseDelay + index * 170,
            () => {
                appendHephDemoCitedLine(
                    responseLine,
                    "heph-demo-response",
                );
            },
        );
    });

    scheduleHephDemoStep(
        runId,
        responseDelay + responseLines.length * 170,
        () => {
            appendHephDemoLine(
                `materials: ${sourceList}. Details: /evidence`,
                "sources",
            );
        },
    );

    scheduleHephDemoStep(
        runId,
        responseDelay + responseLines.length * 170 + 50,
        () => {
            setHephDemoRunning(false);
            resetHephDemoInput();
        },
    );
}

hephDemoInput?.addEventListener("input", () => {
    queueHephDemoComposerStateSync();
});

hephDemoInput?.addEventListener("scroll", () => {
    syncHephDemoComposerState();
});

["click", "focus", "keyup", "pointerup", "select"].forEach(
    (eventName) => {
        hephDemoInput?.addEventListener(
            eventName,
            queueHephDemoComposerStateSync,
        );
    },
);

hephDemoSubmit?.addEventListener("click", (event) => {
    if (event.detail > 0) hephDemoSubmit.blur();
});

hephDemoInput?.addEventListener("keydown", (event) => {
    if (
        event.key !== "Enter" ||
        event.shiftKey ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
    ) {
        return;
    }

    event.preventDefault();
    hephDemoForm.requestSubmit();
});

hephDemoForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (hephDemoInput.readOnly) return;

    const prompt = hephDemoInput.value.trim();
    if (!prompt) {
        hephDemoInput.focus();
        return;
    }

    if (runHephDemoEvidenceCommand(prompt)) {
        trackEvent("Heph Demo Evidence Command");
        return;
    }

    startHephDemoRetrieval(prompt);
    trackEvent("Heph Demo Submit");
});
