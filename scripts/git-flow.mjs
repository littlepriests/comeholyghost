#!/usr/bin/env node
/**
 * Git ship helpers for littlepriests/comeholyghost.
 *
 *   corn branch   Create update-MMDDYY from latest preview
 *   corn add      Stage + commit (prompt) + push -u on current feature branch
 *   corn add --sync  Stash if dirty, preview←main, merge into branch, pop, then commit
 *   corn push     Push branch + open/update PR into preview
 *   corn deploy   Promote preview → main when checks are green,
 *                 then clear the batch Vale accept list on preview
 *
 * Machine remote wiring (all ship commands):
 *   --thinkpad  work box → git remote "personal" (github.com-personal)
 *   --aura      home box → git remote "origin" (standard github.com)
 *   (neither)   interactive prompt
 *
 * Feature merges into preview stay manual on GitHub. Production is main only.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import {
  MACHINES,
  batchAcceptHasWords,
  findSecretPaths,
  judgePreviewCommit,
  judgePrChecks,
  mmddyy,
  parseMachineFlags,
  pickUpdateBranchName,
} from "./lib/git-flow-rules.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INTEGRATION = "preview";
const PRODUCTION = "main";
/** Current preview batch. Same note as scripts/edit-prose.mjs. */
const BATCH_ACCEPT = "styles/config/vocabularies/Batch/accept.txt";
const BATCH_ACCEPT_NOTE =
  "# Words for the current preview batch. corn deploy clears this after preview is on main.\n";

/** Set once per run by resolveRemote(). */
let REMOTE = "";

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    encoding: "utf8",
    stdio: opts.stdio ?? ["ignore", "pipe", "pipe"],
    shell: false,
    ...opts
  });
  if (opts.allowFail) return r;
  if (r.status !== 0) {
    const err = (r.stderr || r.stdout || "").trim();
    throw new Error(err || `${cmd} ${args.join(" ")} failed (${r.status})`);
  }
  return r;
}

function git(...args) {
  return run("git", args);
}

function gitOut(...args) {
  return (git(...args).stdout || "").trim();
}

function gh(...args) {
  return run("gh", args);
}

function ghOut(...args) {
  return (gh(...args).stdout || "").trim();
}

function die(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

function promptMachine() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    console.log("Which machine?");
    console.log("  1) thinkpad (work)     — remote: personal");
    console.log("  2) aura (personal)     — remote: origin");
    rl.question("Choose [1/2 or thinkpad/aura]: ", (answer) => {
      rl.close();
      const a = String(answer || "").trim().toLowerCase();
      if (a === "1" || a === "thinkpad" || a === "t" || a === "work") {
        resolve("thinkpad");
        return;
      }
      if (a === "2" || a === "aura" || a === "a" || a === "home") {
        resolve("aura");
        return;
      }
      die("Need thinkpad or aura (1 or 2).");
    });
  });
}

async function resolveRemote(machineFlag) {
  const id = machineFlag || (await promptMachine());
  const profile = MACHINES[id];
  if (!profile) die(`Unknown machine: ${id}`);
  REMOTE = profile.remote;
  console.log(`Using ${profile.label} → remote "${REMOTE}"`);
  return profile;
}

function assertRemote() {
  if (!REMOTE) die("Internal error: remote not resolved.");
  const urls = gitOut("remote", "-v");
  const lines = urls.split("\n").map((s) => s.trim()).filter(Boolean);
  const forName = lines.filter((line) => line.startsWith(`${REMOTE}\t`) || line.startsWith(`${REMOTE} `));
  if (!forName.length) {
    die(
      `Missing remote "${REMOTE}". Expected littlepriests/comeholyghost.\n` +
        `  thinkpad → remote name "personal"\n` +
        `  aura     → remote name "origin"`
    );
  }
  if (!forName.some((line) => /littlepriests\/comeholyghost/.test(line))) {
    die(`Remote "${REMOTE}" should point at littlepriests/comeholyghost.`);
  }
}

function currentBranch() {
  return gitOut("branch", "--show-current");
}

function nextUpdateBranch() {
  const base = `update-${mmddyy()}`;
  const local = gitOut("branch", "--list", `${base}*`)
    .split("\n")
    .map((s) => s.replace(/^\*?\s*/, "").trim())
    .filter(Boolean);
  const remote = gitOut("branch", "-r", "--list", `${REMOTE}/${base}*`)
    .split("\n")
    .map((s) => s.trim().replace(new RegExp(`^${REMOTE}/`), ""))
    .filter(Boolean);
  const name = pickUpdateBranchName(base, new Set([...local, ...remote]));
  if (!name) throw new Error("Too many update-* branches for today.");
  return name;
}

function fetchAll() {
  console.log(`Fetching ${REMOTE}…`);
  git("fetch", REMOTE, "--prune");
}

function ensureLocalBranch(name, startPoint) {
  const exists = gitOut("branch", "--list", name);
  if (exists) {
    git("checkout", name);
    return;
  }
  git("checkout", "-b", name, startPoint);
}

function updatePreviewFromMain() {
  fetchAll();
  ensureLocalBranch(INTEGRATION, `${REMOTE}/${INTEGRATION}`);
  // Bring production fixes into the integration branch.
  const r = run(
    "git",
    ["merge", "--no-edit", `${REMOTE}/${PRODUCTION}`],
    { allowFail: true, stdio: "inherit" }
  );
  if (r.status !== 0) {
    throw new Error(
      `Could not merge ${PRODUCTION} into ${INTEGRATION}. You are on ${INTEGRATION} with that merge unfinished. Finish it (git commit) or abort it (git merge --abort) before re-running.`
    );
  }
  // Keep remote preview current when this machine can push it (no force).
  const push = run("git", ["push", REMOTE, INTEGRATION], {
    allowFail: true,
    stdio: "inherit"
  });
  if (push.status !== 0) {
    console.warn(
      `Note: local ${INTEGRATION} has ${PRODUCTION}; push to ${REMOTE}/${INTEGRATION} failed (merge PRs there manually if needed).`
    );
  }
}

function promptCommitMessage() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question("Commit message: ", (answer) => {
      rl.close();
      resolve(String(answer || "").trim());
    });
  });
}

function listChanges() {
  const staged = gitOut("diff", "--cached", "--name-only");
  const unstaged = gitOut("diff", "--name-only");
  const untracked = gitOut("ls-files", "--others", "--exclude-standard");
  return [...new Set(
    [staged, unstaged, untracked]
      .join("\n")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
  )];
}

function assertNoSecrets(paths) {
  const bad = findSecretPaths(paths);
  if (bad.length) {
    die(
      `Refusing to stage likely secrets:\n  ${bad.join("\n  ")}\nMove them out of the tree or rename before corn add.`
    );
  }
}

function isDirty() {
  return Boolean(gitOut("status", "--porcelain"));
}

/** @returns {boolean} true if a stash entry was created */
function stashPush(message) {
  if (!isDirty()) return false;
  console.log("Stashing local changes (including untracked)…");
  run("git", ["stash", "push", "-u", "-m", message], { stdio: "inherit" });
  console.log("If something fails mid-sync, recover with: git stash pop");
  return true;
}

function stashPop() {
  console.log("Restoring stash…");
  const r = run("git", ["stash", "pop"], {
    allowFail: true,
    stdio: "inherit",
  });
  if (r.status !== 0) {
    throw new Error(
      "stash pop hit conflicts. Fix files, then `git add` / finish the merge.\n" +
        "If the stash entry remains: git stash list"
    );
  }
}

async function cmdBranch() {
  assertRemote();
  updatePreviewFromMain();
  const name = nextUpdateBranch();
  git("checkout", "-b", name, INTEGRATION);
  console.log(`Created ${name} from ${INTEGRATION}.`);
}

/**
 * Default: stage + commit + push on the current feature branch (no preview checkout).
 * --sync: stash if dirty → preview←main → merge preview into branch → pop → commit.
 * On main/preview: always sync enough to create update-* (stash if dirty).
 */
async function cmdAdd(args = []) {
  assertRemote();
  const sync = args.includes("--sync");
  const unknown = args.filter((a) => a !== "--sync");
  if (unknown.length) {
    die(`Unknown add flag(s): ${unknown.join(" ")}`);
  }

  let branch = currentBranch();
  const onProtected =
    !branch || branch === INTEGRATION || branch === PRODUCTION;
  const startBranch = branch;
  const needSync = sync || onProtected;

  if (needSync) {
    const stashMsg = sync ? "corn-add-sync" : "corn-add-new-branch";
    const stashed = stashPush(stashMsg);
    try {
      updatePreviewFromMain();

      if (onProtected) {
        const name = nextUpdateBranch();
        git("checkout", "-b", name, INTEGRATION);
        branch = name;
        console.log(`Not on a feature branch — created ${branch}.`);
      } else {
        git("checkout", startBranch);
        branch = startBranch;
        console.log(`Merging ${INTEGRATION} into ${branch}…`);
        const merge = run("git", ["merge", "--no-edit", INTEGRATION], {
          allowFail: true,
          stdio: "inherit",
        });
        if (merge.status !== 0) {
          throw new Error(
            `Merge from ${INTEGRATION} failed. Resolve the conflicts, then re-run corn add.`
          );
        }
      }

      if (stashed) stashPop();
    } catch (err) {
      if (stashed) {
        console.error(
          "Sync failed with a stash still saved. Recover with: git stash pop"
        );
      }
      throw err;
    }
  } else if (branch && !branch.startsWith("update-")) {
    console.warn(
      `On "${branch}" (not update-*). Continuing; PR base will still be ${INTEGRATION}.`
    );
  }

  branch = currentBranch();
  const paths = listChanges();
  if (!paths.length) {
    if (!isDirty()) {
      console.log("Nothing to commit.");
      ensureRemoteBranch(branch);
      return;
    }
  }
  assertNoSecrets(paths);

  git("add", "-A");
  const staged = gitOut("diff", "--cached", "--name-only");
  if (!staged) {
    console.log("Nothing staged after add.");
    ensureRemoteBranch(branch);
    return;
  }

  const msg = await promptCommitMessage();
  if (!msg) die("Empty commit message — aborted.");

  // Avoid Cursor attribution trailers; repo hook also strips them.
  run("git", ["commit", "-m", msg], { stdio: "inherit" });
  ensureRemoteBranch(branch);
  console.log(
    `Committed on ${branch}. Remote branch ${REMOTE}/${branch} is up (base: ${INTEGRATION}).`
  );
  console.log(`Next: corn push`);
}

function ensureRemoteBranch(branch) {
  const r = run("git", ["push", "-u", REMOTE, branch], {
    allowFail: true,
    stdio: "inherit"
  });
  if (r.status !== 0) {
    die(`Could not push ${branch} to ${REMOTE}.`);
  }
}

async function cmdPush() {
  assertRemote();
  fetchAll();
  const branch = currentBranch();
  if (!branch || branch === PRODUCTION) {
    die(`Refuse to push ${PRODUCTION} via corn push. Use corn deploy.`);
  }
  if (branch === INTEGRATION) {
    die(`You're on ${INTEGRATION}. Open/merge feature PRs on GitHub, then corn deploy.`);
  }

  run("git", ["push", "-u", REMOTE, branch], { stdio: "inherit" });

  let prUrl = "";
  const existing = run(
    "gh",
    [
      "pr",
      "list",
      "--repo",
      "littlepriests/comeholyghost",
      "--head",
      branch,
      "--base",
      INTEGRATION,
      "--json",
      "url",
      "--jq",
      ".[0].url"
    ],
    { allowFail: true }
  );
  prUrl = (existing.stdout || "").trim();

  const compareUrl = `https://github.com/littlepriests/comeholyghost/compare/${INTEGRATION}...${branch}?expand=1`;

  if (!prUrl) {
    const title = gitOut("log", "-1", "--pretty=%s") || branch;
    const created = run(
      "gh",
      [
        "pr",
        "create",
        "--repo",
        "littlepriests/comeholyghost",
        "--base",
        INTEGRATION,
        "--head",
        branch,
        "--title",
        title,
        "--body",
        `## Summary\n- ${title}\n\n## Test plan\n- [ ] Deploy Preview looks right\n- [ ] No production-only secrets in the diff\n`
      ],
      { allowFail: true }
    );
    prUrl = (created.stdout || "").trim().split("\n").filter(Boolean).pop() || "";
    if (prUrl && created.status === 0) {
      console.log(`Opened PR → ${INTEGRATION}: ${prUrl}`);
    } else {
      console.warn(
        `gh could not open the PR (wrong GitHub login?). Open this — base is ${INTEGRATION}, not ${PRODUCTION}:\n  ${compareUrl}`
      );
      if ((created.stderr || "").trim()) {
        console.warn((created.stderr || "").trim());
      }
    }
  } else {
    console.log(`PR already open → ${INTEGRATION}: ${prUrl}`);
  }
}

function previewChecksGreen() {
  // Prefer checks on the open preview→main PR; else branch checks on preview.
  const prNum = (
    run(
      "gh",
      [
        "pr",
        "list",
        "--repo",
        "littlepriests/comeholyghost",
        "--base",
        PRODUCTION,
        "--head",
        INTEGRATION,
        "--state",
        "open",
        "--json",
        "number",
        "--jq",
        ".[0].number"
      ],
      { allowFail: true }
    ).stdout || ""
  ).trim();

  if (prNum) {
    const checks = run(
      "gh",
      ["pr", "checks", prNum, "--repo", "littlepriests/comeholyghost"],
      { allowFail: true }
    );
    const out = `${checks.stdout || ""}\n${checks.stderr || ""}`;
    return { ...judgePrChecks(checks.status, out), prNum };
  }

  // No PR yet — legacy combined status, then check runs. A failed read blocks.
  const sha = gitOut("rev-parse", `${REMOTE}/${INTEGRATION}`);
  const rollup = run(
    "gh",
    [
      "api",
      `repos/littlepriests/comeholyghost/commits/${sha}/status`,
      "--jq",
      "{state:.state,total:.total_count}"
    ],
    { allowFail: true }
  );
  const runs = run(
    "gh",
    [
      "api",
      `repos/littlepriests/comeholyghost/commits/${sha}/check-runs`,
      "--jq",
      "[.check_runs[] | {name, status, conclusion}]"
    ],
    { allowFail: true }
  );
  const status = parseGhJson(rollup);
  const list = parseGhJson(runs);
  return {
    ...judgePreviewCommit({
      statusOk: status !== null && typeof status === "object" && !Array.isArray(status),
      state: status && status.state,
      total: status && status.total,
      runsOk: Array.isArray(list),
      runs: Array.isArray(list) ? list : [],
    }),
    prNum: null,
  };
}

function parseGhJson(result) {
  if (!result || result.status !== 0) return null;
  const text = (result.stdout || "").trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function batchAcceptText(rev) {
  const shown = run("git", ["show", `${rev}:${BATCH_ACCEPT}`], { allowFail: true });
  if (shown.status !== 0) return "";
  return shown.stdout || "";
}

/**
 * After preview's commits are on main, drop batch accept words on preview.
 * The clear commit only touches the accept file, so Vale does not re-read posts.
 * Skips when the list is already empty. Refuses while preview still has commits
 * main does not, so a not-yet-promoted batch stays intact.
 */
function clearBatchAcceptOnPreview() {
  fetchAll();
  const previewRev = `${REMOTE}/${INTEGRATION}`;
  const mainRev = `${REMOTE}/${PRODUCTION}`;
  if (!batchAcceptHasWords(batchAcceptText(previewRev))) return;

  const ahead = gitOut(
    "rev-list",
    "--count",
    `${mainRev}..${previewRev}`
  );
  if (Number(ahead) > 0) {
    console.log(
      `${INTEGRATION} is still ahead of ${PRODUCTION}; left the batch accept list in place.`
    );
    return;
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "corn-batch-accept-"));
  let added = false;
  try {
    const rev = gitOut("rev-parse", previewRev);
    run("git", ["worktree", "add", "--detach", tmp, rev]);
    added = true;
    fs.mkdirSync(path.dirname(path.join(tmp, BATCH_ACCEPT)), { recursive: true });
    fs.writeFileSync(path.join(tmp, BATCH_ACCEPT), BATCH_ACCEPT_NOTE, "utf8");
    run("git", ["-C", tmp, "add", "--", BATCH_ACCEPT]);
    run("git", [
      "-C",
      tmp,
      "commit",
      "-m",
      "Clear the batch Vale accept list after it reached main.",
    ]);
    run("git", ["-C", tmp, "push", REMOTE, `HEAD:refs/heads/${INTEGRATION}`]);
    console.log(
      `Cleared ${BATCH_ACCEPT} on ${INTEGRATION}. The next batch starts empty.`
    );
  } finally {
    if (added) {
      run("git", ["worktree", "remove", "--force", tmp], { allowFail: true });
    }
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

async function cmdDeploy(args) {
  assertRemote();
  const dry = args.includes("--dry-run");
  const prOnly = args.includes("--pr-only");
  const unknown = args.filter(
    (a) => a !== "--dry-run" && a !== "--pr-only"
  );
  if (unknown.length) {
    die(`Unknown deploy flag(s): ${unknown.join(" ")}`);
  }

  fetchAll();
  const behind = gitOut(
    "rev-list",
    "--left-right",
    "--count",
    `${REMOTE}/${PRODUCTION}...${REMOTE}/${INTEGRATION}`
  );
  // ahead of main = second number
  const parts = behind.split(/\s+/).map(Number);
  const previewAhead = parts[1] || 0;
  const batchPending = batchAcceptHasWords(
    batchAcceptText(`${REMOTE}/${INTEGRATION}`)
  );
  if (!previewAhead) {
    console.log(`${INTEGRATION} has nothing new for ${PRODUCTION}.`);
    if (batchPending && dry) {
      console.log(
        `[dry-run] Would clear ${BATCH_ACCEPT} on ${INTEGRATION}.`
      );
    } else if (batchPending) {
      clearBatchAcceptOnPreview();
    }
    return;
  }
  console.log(`${INTEGRATION} is ${previewAhead} commit(s) ahead of ${PRODUCTION}.`);

  const status = previewChecksGreen();
  if (!status.ok) {
    die(
      `Checks are not green on ${INTEGRATION} — not promoting to ${PRODUCTION}.\n${status.detail}`
    );
  }
  console.log(`Checks ok: ${status.detail}`);

  let prNum = status.prNum;
  let prUrl = "";
  if (!prNum) {
    if (dry) {
      console.log(`[dry-run] Would open PR ${INTEGRATION} → ${PRODUCTION}.`);
      if (batchPending) {
        console.log(
          `[dry-run] After that merge, would clear ${BATCH_ACCEPT} on ${INTEGRATION}.`
        );
      }
      return;
    }
    const created = ghOut(
      "pr",
      "create",
      "--repo",
      "littlepriests/comeholyghost",
      "--base",
      PRODUCTION,
      "--head",
      INTEGRATION,
      "--title",
      `Release: ${INTEGRATION} → ${PRODUCTION}`,
      "--body",
      `## Summary\n- Promote merged ${INTEGRATION} work to production (${PRODUCTION}).\n\n## Test plan\n- [ ] Preview / branch deploy looked good\n- [ ] Checks green\n`
    );
    prUrl = created.split("\n").filter(Boolean).pop() || created;
    prNum = (
      run(
        "gh",
        [
          "pr",
          "list",
          "--repo",
          "littlepriests/comeholyghost",
          "--base",
          PRODUCTION,
          "--head",
          INTEGRATION,
          "--state",
          "open",
          "--json",
          "number",
          "--jq",
          ".[0].number"
        ],
        { allowFail: true }
      ).stdout || ""
    ).trim();
    console.log(`Opened release PR: ${prUrl}`);
  } else {
    prUrl = ghOut(
      "pr",
      "view",
      String(prNum),
      "--repo",
      "littlepriests/comeholyghost",
      "--json",
      "url",
      "--jq",
      ".url"
    );
    console.log(`Release PR: ${prUrl}`);
  }

  if (prOnly || dry) {
    if (dry) console.log("[dry-run] Skipping merge.");
    else console.log("Stopped at PR (--pr-only). Merge in GitHub when ready.");
    if (batchPending && dry) {
      console.log(
        `[dry-run] After that merge, would clear ${BATCH_ACCEPT} on ${INTEGRATION}.`
      );
    } else if (batchPending) {
      console.log(
        `Batch accept list stays until this release is on ${PRODUCTION}. Run corn deploy again after the merge to clear it.`
      );
    }
    return;
  }

  // Re-check on the PR itself before merge.
  const re = previewChecksGreen();
  if (!re.ok) {
    die(`Checks flipped before merge:\n${re.detail}`);
  }

  run(
    "gh",
    [
      "pr",
      "merge",
      String(prNum),
      "--repo",
      "littlepriests/comeholyghost",
      "--merge",
      "--delete-branch=false"
    ],
    { stdio: "inherit" }
  );
  console.log(`Merged ${INTEGRATION} → ${PRODUCTION}. Netlify will production-deploy main.`);
  clearBatchAcceptOnPreview();
}

function usage() {
  console.log(`Usage: corn <branch|add|push|deploy> [--thinkpad|--aura] [flags]

  Machine (required wiring; all ship commands):
    --thinkpad    Work box → git remote "personal"
    --aura        Home box → git remote "origin"
    (neither)     Prompt: thinkpad or aura

  corn branch     Create update-MMDDYY from preview (after preview ← main)
  corn add        Stage + commit (prompt) + push -u on current feature branch
  corn add --sync Stash if dirty, preview←main, merge into branch, pop, commit
  corn push       Push branch + open/update PR into preview
  corn deploy     If preview checks are green, PR + merge preview → main,
                  then clear the batch Vale accept list on preview
  corn deploy --pr-only   Open/update release PR only (no merge)
  corn deploy --dry-run   Show what would happen

You merge feature PRs into preview on GitHub. corn deploy only promotes to main.`);
}

async function main() {
  const [cmd, ...rawArgs] = process.argv.slice(2);
  try {
    if (cmd === "help" || cmd === "--help" || !cmd) {
      usage();
      return;
    }
    if (!["branch", "add", "push", "deploy"].includes(cmd)) {
      die(`Unknown git-flow command: ${cmd}`);
    }
    const { machine, rest } = parseMachineFlags(rawArgs);
    await resolveRemote(machine);
    if (cmd === "branch") await cmdBranch();
    else if (cmd === "add") await cmdAdd(rest);
    else if (cmd === "push") await cmdPush();
    else if (cmd === "deploy") await cmdDeploy(rest);
  } catch (err) {
    die(err.message || String(err));
  }
}

main();
