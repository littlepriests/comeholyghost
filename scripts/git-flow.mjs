#!/usr/bin/env node
/**
 * Git ship helpers for littlepriests/comeholyghost (remote: personal).
 *
 *   corn branch   Create update-MMDDYY from latest preview
 *   corn add      Sync preview ← main, stage, commit (prompt), push -u
 *   corn push     Push branch + open/update PR into preview
 *   corn deploy   Promote preview → main when checks are green
 *
 * Feature merges into preview stay manual on GitHub. Production is main only.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REMOTE = "personal";
const INTEGRATION = "preview";
const PRODUCTION = "main";

const SECRET_HINT =
  /(^|\/)(\.env|\.env\.|.*credentials.*|.*secret.*|.*\.pem$|.*id_rsa|.*kubeconfig)/i;

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

function assertRemote() {
  const urls = gitOut("remote", "-v");
  if (!urls.includes(REMOTE)) {
    die(`Missing remote "${REMOTE}". Expected littlepriests/comeholyghost.`);
  }
  if (!/littlepriests\/comeholyghost/.test(urls)) {
    die(`Remote "${REMOTE}" should point at littlepriests/comeholyghost.`);
  }
}

function currentBranch() {
  return gitOut("branch", "--show-current");
}

function mmddyy(d = new Date()) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}${dd}${yy}`;
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
  const taken = new Set([...local, ...remote]);
  if (!taken.has(base)) return base;
  for (let i = 2; i < 50; i++) {
    const name = `${base}-${i}`;
    if (!taken.has(name)) return name;
  }
  die("Too many update-* branches for today.");
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
    die(
      `Could not merge ${PRODUCTION} into ${INTEGRATION}. Resolve conflicts, then re-run.`
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
  const bad = paths.filter((p) => SECRET_HINT.test(p));
  if (bad.length) {
    die(
      `Refusing to stage likely secrets:\n  ${bad.join("\n  ")}\nMove them out of the tree or rename before corn add.`
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

async function cmdAdd() {
  assertRemote();
  updatePreviewFromMain();

  let branch = currentBranch();
  if (branch === INTEGRATION || branch === PRODUCTION) {
    const name = nextUpdateBranch();
    git("checkout", "-b", name, INTEGRATION);
    branch = name;
    console.log(`Not on a feature branch — created ${branch}.`);
  } else if (!branch.startsWith("update-")) {
    console.warn(
      `On "${branch}" (not update-*). Continuing; PR base will still be ${INTEGRATION}.`
    );
  }

  // Fold latest preview (incl. main) into the feature branch.
  const merge = run("git", ["merge", "--no-edit", INTEGRATION], {
    allowFail: true,
    stdio: "inherit"
  });
  if (merge.status !== 0) {
    die(`Merge from ${INTEGRATION} failed. Resolve conflicts, then re-run corn add.`);
  }

  const paths = listChanges();
  if (!paths.length) {
    const dirty = gitOut("status", "--porcelain");
    if (!dirty) {
      console.log("Nothing to commit.");
      // Still ensure remote branch exists for later corn push.
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
  console.log(`Committed on ${branch}. Remote branch ${REMOTE}/${branch} is up (base: ${INTEGRATION}).`);
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
    if (/fail|pending|error/i.test(out) && !/pass/i.test(out)) {
      return { ok: false, detail: out.trim() || "checks not green", prNum };
    }
    // gh pr checks exits 0 when all pass, 1 when pending/fail
    if (checks.status !== 0) {
      return { ok: false, detail: out.trim() || "checks not green", prNum };
    }
    return { ok: true, detail: out.trim() || "all checks passed", prNum };
  }

  // No PR yet — inspect latest commit status on preview via API.
  const sha = gitOut("rev-parse", `${REMOTE}/${INTEGRATION}`);
  const rollup = run(
    "gh",
    [
      "api",
      `repos/littlepriests/comeholyghost/commits/${sha}/status`,
      "--jq",
      ".state"
    ],
    { allowFail: true }
  );
  const state = (rollup.stdout || "").trim();
  if (state === "success" || state === "") {
    // Empty often means no legacy status API checks; Netlify may only use check-runs.
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
    let list = [];
    try {
      list = JSON.parse(runs.stdout || "[]");
    } catch {
      list = [];
    }
    if (!list.length) {
      return {
        ok: true,
        detail: "No check runs reported on preview (treating as clear).",
        prNum: null
      };
    }
    const bad = list.filter(
      (c) =>
        c.status !== "completed" ||
        (c.conclusion && !["success", "neutral", "skipped"].includes(c.conclusion))
    );
    if (bad.length) {
      return {
        ok: false,
        detail: bad
          .map((c) => `${c.name}: ${c.status}/${c.conclusion || "?"}`)
          .join("\n"),
        prNum: null
      };
    }
    return { ok: true, detail: "All check runs completed successfully.", prNum: null };
  }
  return { ok: false, detail: `preview commit status: ${state}`, prNum: null };
}

async function cmdDeploy(args) {
  assertRemote();
  const dry = args.includes("--dry-run");
  const prOnly = args.includes("--pr-only");

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
  if (!previewAhead) {
    console.log(`${INTEGRATION} has nothing new for ${PRODUCTION}.`);
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
}

function usage() {
  console.log(`Usage: corn <branch|add|push|deploy> [flags]

  corn branch     Create update-MMDDYY from preview (after preview ← main)
  corn add        Sync preview ← main, stage, commit (prompt), push -u branch
  corn push       Push branch + open/update PR into preview
  corn deploy     If preview checks are green, PR + merge preview → main
  corn deploy --pr-only   Open/update release PR only (no merge)
  corn deploy --dry-run   Show what would happen

You merge feature PRs into preview on GitHub. corn deploy only promotes to main.`);
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  try {
    if (cmd === "branch") await cmdBranch();
    else if (cmd === "add") await cmdAdd();
    else if (cmd === "push") await cmdPush();
    else if (cmd === "deploy") await cmdDeploy(args);
    else if (cmd === "help" || cmd === "--help" || !cmd) usage();
    else die(`Unknown git-flow command: ${cmd}`);
  } catch (err) {
    die(err.message || String(err));
  }
}

main();
