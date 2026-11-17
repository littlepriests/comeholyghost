import { test } from "node:test";
import assert from "node:assert/strict";
import {
    MACHINES,
    batchAcceptHasWords,
    findSecretPaths,
    judgeCheckRuns,
    judgePrChecks,
    mmddyy,
    parseMachineFlags,
    pickUpdateBranchName
} from "../../scripts/lib/git-flow-rules.mjs";

test("machine flags pick the right remote and leave other args alone", () => {
    assert.deepEqual(parseMachineFlags(["--aura", "--sync"]), { machine: "aura", rest: ["--sync"] });
    assert.deepEqual(parseMachineFlags(["--dry-run"]), { machine: null, rest: ["--dry-run"] });
    assert.equal(MACHINES.thinkpad.remote, "personal");
    assert.equal(MACHINES.aura.remote, "origin");
});

test("both machine flags at once is an error, repeating one is fine", () => {
    assert.throws(() => parseMachineFlags(["--aura", "--thinkpad"]), /only one/);
    assert.equal(parseMachineFlags(["--aura", "--aura"]).machine, "aura");
});

test("update branches are named by date and count up when taken", () => {
    assert.equal(mmddyy(new Date(2026, 10, 16)), "111626");
    const base = "update-111626";
    assert.equal(pickUpdateBranchName(base, new Set()), base);
    assert.equal(pickUpdateBranchName(base, new Set([base, `${base}-2`])), `${base}-3`);
    const full = new Set([base, ...Array.from({ length: 48 }, (_, i) => `${base}-${i + 2}`)]);
    assert.equal(pickUpdateBranchName(base, full), null);
});

test("corn add refuses likely secrets but not ordinary files", () => {
    const paths = [
        ".env",
        "netlify/.env.production",
        "keys/site.pem",
        "aws-credentials.json",
        "layouts/index.html",
        "content/blog/crossroad-beauty/index.md"
    ];
    assert.deepEqual(findSecretPaths(paths), [
        ".env",
        "netlify/.env.production",
        "keys/site.pem",
        "aws-credentials.json"
    ]);
});

test("the batch accept list counts as empty when it only has comments", () => {
    assert.equal(batchAcceptHasWords("# note\n\n"), false);
    assert.equal(batchAcceptHasWords("# note\nGrundo\n"), true);
    assert.equal(batchAcceptHasWords(""), false);
});

test("deploy gate: gh pr checks output", () => {
    assert.equal(judgePrChecks(0, "netlify\tpass\nvale\tpass").ok, true);
    assert.equal(judgePrChecks(1, "netlify\tpending").ok, false);
    assert.equal(judgePrChecks(1, "vale\tfail").ok, false);
    assert.equal(judgePrChecks(1, "netlify\tpass\nvale\tfail").ok, false, "a non-zero exit always blocks");
});

test("deploy gate: commit check runs", () => {
    assert.equal(judgeCheckRuns([]).ok, true);
    assert.equal(
        judgeCheckRuns([
            { name: "vale", status: "completed", conclusion: "success" },
            { name: "lint", status: "completed", conclusion: "skipped" }
        ]).ok,
        true
    );
    const blocked = judgeCheckRuns([
        { name: "vale", status: "completed", conclusion: "success" },
        { name: "tests", status: "in_progress", conclusion: null },
        { name: "netlify", status: "completed", conclusion: "failure" }
    ]);
    assert.equal(blocked.ok, false);
    assert.equal(blocked.detail, "tests: in_progress/?\nnetlify: completed/failure");
});
