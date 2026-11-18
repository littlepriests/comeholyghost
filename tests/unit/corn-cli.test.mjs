import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const corn = fileURLToPath(new URL("../../scripts/corn.mjs", import.meta.url));
const gitFlow = fileURLToPath(new URL("../../scripts/git-flow.mjs", import.meta.url));

function run(script, ...args) {
    const r = spawnSync(process.execPath, [script, ...args], {
        encoding: "utf8",
        env: { ...process.env, NO_COLOR: "1" },
        stdio: ["ignore", "pipe", "pipe"]
    });
    return { status: r.status, out: `${r.stdout}${r.stderr}` };
}

test("corn help writer commands prints the Writer section", () => {
    const r = run(corn, "help", "writer", "commands");
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /WRITER/);
    assert.match(r.out, /corn run/);
});

test("corn help with no pick and no terminal asks for one", () => {
    const r = run(corn, "help");
    assert.equal(r.status, 2);
    assert.match(r.out, /needs a pick/);
});

test("an unknown corn command exits 2", () => {
    const r = run(corn, "frobnicate");
    assert.equal(r.status, 2);
    assert.match(r.out, /Unknown command: frobnicate/);
});

test("ship commands reject both machine flags before touching git", () => {
    const r = run(gitFlow, "deploy", "--aura", "--thinkpad");
    assert.equal(r.status, 1);
    assert.match(r.out, /only one of --aura \/ --thinkpad/);
});
