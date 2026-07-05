// Email copy functionality
document
    .querySelector(".email")
    .addEventListener("click", async function () {
        this.blur();

        try {
            await navigator.clipboard.writeText("hi@gildrb.com");
            this.classList.add("copied");
            trackEvent("Email Copy", { result: "success" });
            announce("Email copied to clipboard");
        } catch {
            this.classList.add("copy-failed");
            trackEvent("Email Copy", { result: "failed" });
            announce("Email could not be copied");
        }

        setTimeout(() => {
            this.classList.remove("copied", "copy-failed");
        }, 1500);
    });
