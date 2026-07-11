const imagePreview = document.querySelector(".image-preview");
const previewImage = imagePreview.querySelector("img");
const previewImageCache = new Map();
let previouslyFocusedElement = null;
let shouldRestorePreviewFocus = false;
let activePreviewSrc = "";

function getPreviewSrc(image) {
    return (
        image.dataset.previewSrc || image.currentSrc || image.src
    );
}

function getImagePortfolioSection(image) {
    const section = image.closest("section");
    const title = section?.previousElementSibling;

    if (title?.classList.contains("section-title")) {
        return title.textContent.trim();
    }

    return "Portfolio";
}

function getImageItem(image) {
    const label = image.closest("button")?.ariaLabel;

    return label
        ? label.replace(/^Open /, "").replace(/ preview$/, "")
        : "Image";
}

function prefetchPreviewImage(image) {
    const previewSrc = getPreviewSrc(image);
    if (!previewSrc) return null;

    if (previewImageCache.has(previewSrc)) {
        return previewImageCache.get(previewSrc);
    }

    const preloadImage = new Image();
    preloadImage.decoding = "async";
    preloadImage.src = previewSrc;
    previewImageCache.set(previewSrc, preloadImage);

    return preloadImage;
}

function showPreviewImage(previewSrc) {
    if (!imagePreview.hidden && activePreviewSrc === previewSrc) {
        previewImage.src = previewSrc;
    }
}

function showPreviewImageWhenReady(preloadedImage, previewSrc) {
    if (!preloadedImage || !previewSrc) return;

    const decodePreview = () => {
        if (preloadedImage.decode) {
            preloadedImage
                .decode()
                .then(() => showPreviewImage(previewSrc))
                .catch(() => showPreviewImage(previewSrc));
            return;
        }

        showPreviewImage(previewSrc);
    };

    if (
        preloadedImage.complete &&
        preloadedImage.naturalWidth > 0
    ) {
        decodePreview();
        return;
    }

    preloadedImage.addEventListener("load", decodePreview, {
        once: true,
    });
}

function openImagePreview(image, options = {}) {
    const previewSrc = getPreviewSrc(image);
    const fallbackSrc = image.currentSrc || image.src;
    const preloadedImage = prefetchPreviewImage(image);

    previouslyFocusedElement = document.activeElement;
    shouldRestorePreviewFocus = options.restoreFocus;
    activePreviewSrc = previewSrc;
    previewImage.src = fallbackSrc;
    previewImage.alt = image.alt;
    imagePreview.hidden = false;
    document.body.classList.add("preview-open");
    imagePreview.focus({ preventScroll: true });

    if (previewSrc && previewSrc !== fallbackSrc) {
        showPreviewImageWhenReady(preloadedImage, previewSrc);
    }

    trackEvent("Image Preview Open", {
        portfolioSection: getImagePortfolioSection(image),
        item: getImageItem(image),
    });
    announce("Image enlarged");
}

function closeImagePreview() {
    if (imagePreview.hidden) return;

    imagePreview.hidden = true;
    activePreviewSrc = "";
    previewImage.src = "data:,";
    document.body.classList.remove("preview-open");

    if (shouldRestorePreviewFocus && previouslyFocusedElement) {
        previouslyFocusedElement.focus({ preventScroll: true });
    }

    previouslyFocusedElement = null;
    shouldRestorePreviewFocus = false;
    announce("Image closed");
}

document
    .querySelectorAll("button.image-wrapper, button.gallery-item")
    .forEach((imageTrigger) => {
        const image = imageTrigger.querySelector("img");
        if (!image) return;

        imageTrigger.addEventListener(
            "pointerenter",
            () => prefetchPreviewImage(image),
            { once: true },
        );

        imageTrigger.addEventListener(
            "focus",
            () => prefetchPreviewImage(image),
            { once: true },
        );

        imageTrigger.addEventListener(
            "pointerdown",
            () => prefetchPreviewImage(image),
            {
                once: true,
                passive: true,
            },
        );

        imageTrigger.addEventListener(
            "touchstart",
            () => prefetchPreviewImage(image),
            {
                once: true,
                passive: true,
            },
        );

        imageTrigger.addEventListener("click", (event) => {
            openImagePreview(image, {
                restoreFocus: event.detail === 0,
            });
        });
    });

imagePreview.addEventListener("click", closeImagePreview);
