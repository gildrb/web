import { spawnSync } from "node:child_process";
import { lstat, readFile, readlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const maxBuffer = 64 * 1024 * 1024;
const publishableRefArgs = ["--branches", "--tags", "--remotes"];

function run(command, args, { allowStatus = [], capture = false } = {}) {
    const result = spawnSync(command, args, {
        cwd: root,
        encoding: "utf8",
        maxBuffer,
        stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    });

    if (result.error) {
        throw result.error;
    }

    if (result.status !== 0 && !allowStatus.includes(result.status)) {
        const detail = capture ? result.stderr.trim() : "";
        throw new Error(
            `${command} ${args.join(" ")} failed with status ${result.status}${
                detail ? `:\n${detail}` : "."
            }`,
        );
    }

    return capture ? result.stdout : "";
}

function splitNulls(value) {
    return value.split("\0").filter(Boolean);
}

function findSensitivePaths(paths) {
    const sensitivePathPatterns = [
        /(^|\/)\.env(?:\.|$)/i,
        /(^|\/)(?:credentials|secrets?)(?:\.[^/]*)?$/i,
        /(^|\/)id_(?:dsa|ecdsa|ed25519|rsa)(?:\.|$)/i,
        /\.(?:jks|key|keystore|p12|pem|pfx)$/i,
    ];

    return paths.filter((file) =>
        sensitivePathPatterns.some((pattern) => pattern.test(file)),
    );
}

function assertNoSensitivePaths(label, paths) {
    const matches = findSensitivePaths(paths);

    if (matches.length > 0) {
        throw new Error(`${label}:\n${[...new Set(matches)].sort().join("\n")}`);
    }
}

run("git", ["rev-parse", "--is-inside-work-tree"]);

const gitleaksVersion = spawnSync("gitleaks", ["version"], {
    cwd: root,
    encoding: "utf8",
});

if (gitleaksVersion.error?.code === "ENOENT") {
    throw new Error(
        "gitleaks is required for the public-safety check. Install it, then rerun this script.",
    );
}

if (gitleaksVersion.status !== 0) {
    throw new Error("Unable to run gitleaks.");
}

const trackedPaths = splitNulls(
    run("git", ["ls-files", "-z"], { capture: true }),
);
const localStatusPaths = [
    ...splitNulls(
        run("git", ["ls-files", "--others", "--exclude-standard", "-z"], {
            capture: true,
        }),
    ),
    ...splitNulls(
        run(
            "git",
            ["ls-files", "--others", "--ignored", "--exclude-standard", "-z"],
            { capture: true },
        ),
    ),
];
const historyPaths = run(
    "git",
    ["log", ...publishableRefArgs, "--name-only", "--pretty=format:"],
    { capture: true },
)
    .split("\n")
    .filter(Boolean);

assertNoSensitivePaths("Sensitive tracked paths found", trackedPaths);
assertNoSensitivePaths("Sensitive local paths found", localStatusPaths);
assertNoSensitivePaths("Sensitive paths found in reachable history", historyPaths);

run("gitleaks", ["dir", "--no-banner", "--redact", "--verbose", "."]);
run("gitleaks", [
    "git",
    "--no-banner",
    "--redact",
    "--verbose",
    `--log-opts=${publishableRefArgs.join(" ")}`,
    ".",
]);

const privacyPattern = [
    "/Users/",
    "/home/",
    "op://",
    "vault://",
    "tailnet",
    "tailscale",
    "-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----",
    "10\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}",
    "192\\.168\\.[0-9]{1,3}\\.[0-9]{1,3}",
    "172\\.(1[6-9]|2[0-9]|3[01])\\.[0-9]{1,3}\\.[0-9]{1,3}",
].join("|");
const revisions = run("git", ["rev-list", ...publishableRefArgs], {
    capture: true,
})
    .trim()
    .split("\n")
    .filter(Boolean);
const privacyMatches = run(
    "git",
    [
        "grep",
        "-I",
        "-l",
        "-E",
        privacyPattern,
        "--",
        ".",
        ":(exclude)scripts/check-public.mjs",
    ],
    { allowStatus: [1], capture: true },
)
    .split("\n")
    .filter(Boolean);
const localPrivacyPattern = new RegExp(privacyPattern, "i");

for (const relativePath of new Set(localStatusPaths)) {
    const absolutePath = path.join(root, relativePath);
    const file = await lstat(absolutePath);

    if (
        relativePath === "scripts/check-public.mjs" ||
        (!file.isFile() && !file.isSymbolicLink())
    ) {
        continue;
    }

    const content = file.isSymbolicLink()
        ? await readlink(absolutePath)
        : await readFile(absolutePath, "utf8");

    if (localPrivacyPattern.test(content)) {
        privacyMatches.push(relativePath);
    }
}

for (let index = 0; index < revisions.length; index += 50) {
    const matches = run(
        "git",
        [
            "grep",
            "-I",
            "-l",
            "-E",
            privacyPattern,
            ...revisions.slice(index, index + 50),
            "--",
            ".",
            ":(exclude)scripts/check-public.mjs",
        ],
        { allowStatus: [1], capture: true },
    );

    privacyMatches.push(...matches.split("\n").filter(Boolean));
}

if (privacyMatches.length > 0) {
    const files = privacyMatches.map((match) => match.replace(/^[^:]+:/, ""));
    throw new Error(
        `Private environment references found in the working tree or publishable history:\n${[
            ...new Set(files),
        ]
            .sort()
            .join("\n")}`,
    );
}

const authorEmails = [
    ...new Set(
        run("git", ["log", ...publishableRefArgs, "--format=%ae"], {
            capture: true,
        })
            .split("\n")
            .filter(Boolean),
    ),
].sort();

console.log("Public-safety checks passed.");
console.log(
    `Reachable author emails for manual privacy review: ${authorEmails.join(", ")}`,
);
