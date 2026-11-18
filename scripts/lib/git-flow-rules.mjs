/**
 * Pure decisions behind corn branch / add / deploy. No git, gh, or prompts here,
 * so tests can import this without touching a repo.
 */

/** @type {Record<string, { id: string, label: string, remote: string }>} */
export const MACHINES = {
  thinkpad: {
    id: "thinkpad",
    label: "thinkpad (work)",
    remote: "personal",
  },
  aura: {
    id: "aura",
    label: "aura (personal)",
    remote: "origin",
  },
};

export const SECRET_HINT =
  /(^|\/)(\.env|\.env\.|.*credentials.*|.*secret.*|.*\.pem$|.*id_rsa|.*kubeconfig)/i;

/** Splits --thinkpad / --aura off the args. Throws when both are given. */
export function parseMachineFlags(args) {
  const rest = [];
  let machine = null;
  for (const a of args) {
    if (a === "--thinkpad" || a === "--aura") {
      const id = a.slice(2);
      if (machine && machine !== id) {
        throw new Error("Use only one of --aura / --thinkpad.");
      }
      machine = id;
    } else {
      rest.push(a);
    }
  }
  return { machine, rest };
}

export function mmddyy(d = new Date()) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}${dd}${yy}`;
}

/** First free name: base, then base-2 … base-49. Null when all are taken. */
export function pickUpdateBranchName(base, taken) {
  if (!taken.has(base)) return base;
  for (let i = 2; i < 50; i++) {
    const name = `${base}-${i}`;
    if (!taken.has(name)) return name;
  }
  return null;
}

export function findSecretPaths(paths) {
  return paths.filter((p) => SECRET_HINT.test(p));
}

export function batchAcceptHasWords(text) {
  return String(text || "").split(/\r?\n/).some((line) => {
    const trimmed = line.trim();
    return trimmed && !trimmed.startsWith("#");
  });
}

/** `gh pr checks` exits 0 when all pass, 1 when pending/fail. */
export function judgePrChecks(exitStatus, output) {
  const out = String(output || "").trim();
  if (/fail|pending|error/i.test(out) && !/pass/i.test(out)) {
    return { ok: false, detail: out || "checks not green" };
  }
  if (exitStatus !== 0) {
    return { ok: false, detail: out || "checks not green" };
  }
  return { ok: true, detail: out || "all checks passed" };
}

/**
 * No release PR is open. May this preview commit ship?
 * `statusOk` / `runsOk` are false when that GitHub call failed.
 * A legacy combined status of pending with total 0 has nothing to say;
 * check runs decide. A failed read never counts as green.
 * Pending with zero statuses and zero check runs means nothing has
 * reported yet, so it blocks. A successful status with an empty
 * check-run list stays clear.
 */
export function judgePreviewCommit({ statusOk, state, total, runsOk, runs }) {
  if (!statusOk) {
    return { ok: false, detail: "Could not read the preview commit status." };
  }
  const normalized = String(state ?? "").trim();
  const noLegacy = normalized === "pending" && total === 0;
  if (normalized === "failure" || normalized === "error") {
    return { ok: false, detail: `preview commit status: ${normalized}` };
  }
  if (normalized === "pending" && !noLegacy) {
    return { ok: false, detail: "preview commit status: pending" };
  }
  if (normalized !== "success" && !noLegacy) {
    return {
      ok: false,
      detail: `preview commit status: ${normalized || "unknown"}`,
    };
  }
  if (!runsOk) {
    return { ok: false, detail: "Could not read preview check runs." };
  }
  const list = Array.isArray(runs) ? runs : [];
  if (noLegacy && list.length === 0) {
    return { ok: false, detail: "No check runs reported on preview yet." };
  }
  return judgeCheckRuns(list);
}

/** Check runs from the GitHub API: [{ name, status, conclusion }]. */
export function judgeCheckRuns(list) {
  if (!list.length) {
    return { ok: true, detail: "No check runs reported on preview (treating as clear)." };
  }
  const bad = list.filter(
    (c) =>
      c.status !== "completed" ||
      (c.conclusion && !["success", "neutral", "skipped"].includes(c.conclusion))
  );
  if (bad.length) {
    return {
      ok: false,
      detail: bad.map((c) => `${c.name}: ${c.status}/${c.conclusion || "?"}`).join("\n"),
    };
  }
  return { ok: true, detail: "All check runs completed successfully." };
}
