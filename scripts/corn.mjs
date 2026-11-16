#!/usr/bin/env node
/**
 * Site CLI: corn <command> …
 *
 * Help text lives in scripts/corn-help.yaml — edit that file, not this one.
 * Install (PowerShell):  powershell -File scripts/install-corn.ps1
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const HELP_YAML = path.join(here, "corn-help.yaml");
const require = createRequire(import.meta.url);

const COMMANDS = {
  run: "run-hugo.mjs",
  compress: "compress-post-images.mjs",
  edit: "edit-prose.mjs",
  md: "lint-markdown.mjs",
  email: "preview-emails.mjs",
  update: "update-deps.mjs",
};

const GIT_FLOW = new Set(["branch", "add", "push", "deploy"]);

/** Scripts that need scripts/node_modules (sharp, markdownlint, yaml, …). */
const NEEDS_SCRIPTS_DEPS = new Set(["compress", "md"]);

const useColor =
  process.stdout.isTTY &&
  !process.env.NO_COLOR &&
  process.env.FORCE_COLOR !== "0";

const c = {
  reset: useColor ? "\x1b[0m" : "",
  bold: useColor ? "\x1b[1m" : "",
  dim: useColor ? "\x1b[2m" : "",
  italic: useColor ? "\x1b[3m" : "",
  underline: useColor ? "\x1b[4m" : "",
  cyan: useColor ? "\x1b[36m" : "",
  green: useColor ? "\x1b[32m" : "",
  yellow: useColor ? "\x1b[33m" : "",
  magenta: useColor ? "\x1b[35m" : "",
  blue: useColor ? "\x1b[34m" : "",
  white: useColor ? "\x1b[37m" : "",
  brightCyan: useColor ? "\x1b[96m" : "",
  brightGreen: useColor ? "\x1b[92m" : "",
  brightYellow: useColor ? "\x1b[93m" : "",
  brightMagenta: useColor ? "\x1b[95m" : "",
  brightBlue: useColor ? "\x1b[94m" : "",
  brightWhite: useColor ? "\x1b[97m" : "",
};

function paint(style, text) {
  return `${style}${text}${c.reset}`;
}

function loadHelpDoc() {
  const raw = fs.readFileSync(HELP_YAML, "utf8");
  let parse;
  try {
    parse = require("yaml").parse;
  } catch {
    console.error(
      `[corn] missing yaml package for help. From the repo root:\n` +
        `  npm install --prefix scripts\n` +
        `(help source: scripts/corn-help.yaml)`
    );
    process.exit(2);
  }
  return parse(raw);
}

function indentBlock(text, pad, lineStyle = "") {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\s+$/u, "")
    .split("\n")
    .map((line) => {
      if (!line.length) return line;
      return lineStyle ? pad + paint(lineStyle, line) : pad + line;
    })
    .join("\n");
}

function rule(char = "─", width = 72, style = c.dim) {
  return paint(style, char.repeat(width));
}

function padInner(text, width) {
  const t = String(text);
  if (t.length >= width) return t.slice(0, width);
  const left = Math.floor((width - t.length) / 2);
  const right = width - t.length - left;
  return " ".repeat(left) + t + " ".repeat(right);
}

function banner(title, accent) {
  const inner = 70;
  return [
    paint(accent, "╔" + "═".repeat(inner) + "╗"),
    paint(c.bold + accent, "║" + padInner(String(title), inner) + "║"),
    paint(accent, "╚" + "═".repeat(inner) + "╝"),
  ];
}

function metaHeading(title, accent = c.brightMagenta) {
  return paint(c.bold + accent, `◆ ${title}`);
}

function flagRows(flags, flagWidth = 24) {
  const rows = [];
  for (const f of flags) {
    const flag = String(f.flag || "");
    const help = String(f.help || "");
    const pad = Math.max(2, flagWidth - flag.length);
    rows.push(
      "      " +
        paint(c.brightYellow, flag) +
        " ".repeat(pad) +
        paint(c.dim, help)
    );
  }
  return rows;
}

const WRITER_CMDS = new Set(["run", "compress", "edit", "md", "email"]);
const SHIP_CMDS = new Set(["update", "branch", "add", "push", "deploy"]);

function exampleBucket(ex) {
  const m = String(ex).match(/\bcorn\s+(\w+)/);
  const cmd = m?.[1];
  if (WRITER_CMDS.has(cmd)) return "writer";
  if (SHIP_CMDS.has(cmd)) return "ship";
  return "both";
}

function parseHelpScope(args) {
  if (!args.length) return { scope: null, detail: null };
  /** @type {string|null} */
  let scope = null;
  /** @type {"full"|"commands"|null} */
  let detail = null;
  for (const raw of args) {
    const a = String(raw || "")
      .trim()
      .toLowerCase();
    if (
      a === "writer" ||
      a === "--writer" ||
      a === "-w" ||
      a === "write"
    ) {
      scope = "writer";
    } else if (a === "ship" || a === "--ship" || a === "-s") {
      scope = "ship";
    } else if (a === "all" || a === "--all" || a === "-a") {
      scope = "all";
    } else if (a === "install" || a === "--install") {
      scope = "install";
    } else if (
      a === "full" ||
      a === "--full" ||
      a === "docs" ||
      a === "--docs"
    ) {
      detail = "full";
    } else if (
      a === "commands" ||
      a === "--commands" ||
      a === "flags" ||
      a === "--flags" ||
      a === "short" ||
      a === "--short"
    ) {
      detail = "commands";
    } else {
      console.error(`Unknown corn help arg: ${raw}`);
      process.exit(2);
    }
  }
  return { scope, detail };
}

/** One key → scope + detail (no Enter). */
const HELP_MENU = {
  1: { scope: "writer", detail: "commands" },
  2: { scope: "writer", detail: "full" },
  3: { scope: "ship", detail: "commands" },
  4: { scope: "ship", detail: "full" },
  5: { scope: "all", detail: "full" },
  6: { scope: "install", detail: "full" },
};

/**
 * Single-key help picker (no Enter). Falls back to one readline line if raw mode fails.
 * @returns {Promise<{ scope: string, detail: "full"|"commands" }>}
 */
function promptHelpMenu() {
  return new Promise((resolve) => {
    const printMenu = () => {
      console.log(paint(c.bold + c.brightCyan, "corn help"));
      console.log("  1  writer · commands   (flags only)");
      console.log("  2  writer · full");
      console.log("  3  ship · commands     (flags only)");
      console.log("  4  ship · full");
      console.log("  5  all");
      console.log("  6  install");
      console.log(paint(c.dim, "  q  quit"));
      process.stdout.write(paint(c.dim, "Press 1–6 (no Enter): "));
    };

    const finish = (choice) => {
      process.stdout.write("\n");
      resolve(choice);
    };

    const applyKey = (ch) => {
      const k = String(ch || "").toLowerCase();
      if (k === "q" || k === "\u0003") {
        process.stdout.write("\n");
        process.exit(0);
      }
      if (HELP_MENU[k]) {
        finish(HELP_MENU[k]);
        return true;
      }
      return false;
    };

    printMenu();

    if (
      process.stdin.isTTY &&
      typeof process.stdin.setRawMode === "function"
    ) {
      const onData = (buf) => {
        const ch = buf.toString("utf8");
        // Ignore lone CR/LF if something odd sends them
        if (ch === "\r" || ch === "\n") return;
        if (!applyKey(ch[0])) {
          process.stdout.write("\x07"); // bell on bad key
          return;
        }
        process.stdin.off("data", onData);
        process.stdin.setRawMode(false);
        process.stdin.pause();
      };
      process.stdin.resume();
      process.stdin.setRawMode(true);
      process.stdin.once("error", () => {
        process.stdin.setRawMode(false);
      });
      process.stdin.on("data", onData);
      return;
    }

    // Non-raw fallback: one Enter still required
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question("", (answer) => {
      rl.close();
      const a = String(answer || "")
        .trim()
        .toLowerCase();
      if (a === "q") process.exit(0);
      if (HELP_MENU[a]) {
        resolve(HELP_MENU[a]);
        return;
      }
      console.error("Need 1–6. Or: corn help writer commands");
      process.exit(2);
    });
  });
}

/**
 * @param {"full"|"commands"} detail
 */
function renderSection(lines, section, sectionAccent, detail = "full") {
  const accent = sectionAccent[section.name] || c.brightBlue;
  const compact = detail === "commands";
  lines.push(...banner(section.name.toUpperCase(), accent));
  lines.push("");

  if (!compact && section.blurb) {
    lines.push(indentBlock(section.blurb, "  ", c.dim + c.italic));
    lines.push("");
  }

  if (section.shared_flags && section.shared_flags.length) {
    lines.push(
      "  " +
        paint(c.bold + c.white, "Machine flags") +
        paint(c.dim, "  (branch · add · push · deploy)")
    );
    lines.push(...flagRows(section.shared_flags));
    lines.push("");
    if (!compact) {
      lines.push(rule("·", 72, c.dim));
      lines.push("");
    }
  }

  for (const [i, cmd] of (section.commands || []).entries()) {
    if (i > 0 && !compact) {
      lines.push(
        paint(
          c.dim,
          "  · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ·"
        )
      );
      lines.push("");
    }

    lines.push("  " + paint(c.bold + c.brightGreen, "▸ " + cmd.invoke));
    if (!compact && cmd.about) {
      lines.push(indentBlock(cmd.about, "      ", c.white));
    }

    const flags = cmd.flags || [];
    if (flags.length === 0) {
      if (section.shared_flags?.length) {
        lines.push(paint(c.dim, "      flags   (see Machine flags above)"));
      } else if (!compact) {
        lines.push(paint(c.dim, "      flags   (none)"));
      }
    } else {
      if (!compact) lines.push(paint(c.dim + c.bold, "      flags"));
      lines.push(...flagRows(flags));
    }
    lines.push("");
  }
}

function renderExamples(lines, doc, scope) {
  const examples = (doc.examples || []).filter((ex) => {
    if (scope === "all") return true;
    const bucket = exampleBucket(ex);
    return bucket === scope || bucket === "both";
  });
  if (!examples.length) return;
  lines.push(rule("─", 72, c.brightCyan));
  lines.push(metaHeading("Examples", c.brightCyan));
  for (const ex of examples) {
    lines.push("    " + paint(c.dim, "$") + " " + paint(c.brightCyan, ex));
  }
  lines.push("");
}

function findLessBin() {
  const which = spawnSync(
    process.platform === "win32" ? "where.exe" : "which",
    ["less"],
    { encoding: "utf8" }
  );
  if (which.status === 0) {
    const hit = (which.stdout || "")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .find(Boolean);
    if (hit) return hit;
  }
  if (process.platform === "win32") {
    const candidates = [
      path.join(process.env["ProgramFiles"] || "", "Git", "usr", "bin", "less.exe"),
      path.join(
        process.env["ProgramFiles(x86)"] || "",
        "Git",
        "usr",
        "bin",
        "less.exe"
      ),
      path.join(
        process.env.LOCALAPPDATA || "",
        "Programs",
        "Git",
        "usr",
        "bin",
        "less.exe"
      ),
    ];
    for (const p of candidates) {
      if (p && fs.existsSync(p)) return p;
    }
  }
  return null;
}

/**
 * Show help starting at the top of the viewport (pager).
 * Write a temp file so less can use the real TTY for keys/scroll — piping the
 * body on stdin steals the keyboard and degrades to Enter-per-line on Windows.
 */
function emitHelpText(text) {
  const body = text.replace(/\n+$/, "\n");
  if (!process.stdout.isTTY) {
    process.stdout.write(body);
    return;
  }

  const lessBin = findLessBin();
  if (lessBin) {
    const tmp = path.join(
      os.tmpdir(),
      `corn-help-${process.pid}-${Date.now()}.txt`
    );
    try {
      fs.writeFileSync(tmp, body, "utf8");
      // -R colors, -F quit if one screen, -X keep screen, --mouse wheel scroll
      const r = spawnSync(
        lessBin,
        ["-R", "-F", "-X", "--mouse", "--wheel-lines=5", tmp],
        { stdio: "inherit" }
      );
      if (!r.error && (r.status === 0 || r.status === null)) return;
    } finally {
      try {
        fs.unlinkSync(tmp);
      } catch {
        /* ignore */
      }
    }
  }

  // Fallback: clear then dump (still ends at bottom if taller than the screen).
  process.stdout.write("\x1b[2J\x1b[3J\x1b[H");
  process.stdout.write(body);
}

/**
 * @param {"writer"|"ship"|"all"|"install"} scope
 * @param {"full"|"commands"} detail
 */
function printHelp(doc, scope, detail = "full") {
  const lines = [];
  const sectionAccent = {
    Writer: c.brightGreen,
    Ship: c.brightYellow,
  };
  const full = detail === "full";

  // Skip the decorative box so the first content line (e.g. Paths) is at the top.
  if (scope === "all" || scope === "install") {
    // keep a tiny label so install/all still have context
    lines.push(paint(c.bold + c.brightCyan, "corn help"));
    lines.push("");
  }

  if (full && (scope === "all" || scope === "install")) {
    lines.push(metaHeading("Usage", c.brightCyan));
    lines.push(indentBlock(doc.usage, "    ", c.brightWhite));
    lines.push("");
    lines.push(metaHeading("Profiles", c.brightMagenta));
    lines.push(indentBlock(doc.profiles, "    ", c.white));
    lines.push("");
    lines.push(metaHeading("Install", c.brightMagenta));
    lines.push(indentBlock(doc.install, "    ", c.white));
    lines.push("");
  }

  if (scope === "install") {
    if (!full) {
      lines.push(metaHeading("Install", c.brightMagenta));
      lines.push(indentBlock(doc.install, "    ", c.white));
      lines.push("");
    }
    emitHelpText(lines.join("\n"));
    return;
  }

  if (full && (scope === "all" || scope === "writer")) {
    lines.push(metaHeading("Paths", c.brightMagenta));
    lines.push(indentBlock(doc.paths, "    ", c.white));
    lines.push("");
  }

  const want = new Set(
    scope === "all"
      ? (doc.sections || []).map((s) => s.name)
      : scope === "writer"
        ? ["Writer"]
        : ["Ship"]
  );

  for (const section of doc.sections || []) {
    if (!want.has(section.name)) continue;
    renderSection(lines, section, sectionAccent, detail);
  }

  if (full && (scope === "all" || scope === "ship") && doc.ship) {
    lines.push(rule("─", 72, c.brightMagenta));
    lines.push(metaHeading("Ship flow", c.brightMagenta));
    lines.push(indentBlock(doc.ship, "    ", c.white));
    lines.push("");
  }

  if (full) renderExamples(lines, doc, scope);

  lines.push(
    paint(
      c.dim,
      "  tip: corn help writer commands · corn help ship full · corn help all"
    )
  );
  lines.push("");
  lines.push(
    paint(
      c.dim,
      "  (scroll / space / arrows · q quit)"
    )
  );
  lines.push("");

  emitHelpText(lines.join("\n"));
}

async function usage(args = []) {
  const doc = loadHelpDoc();
  let { scope, detail } = parseHelpScope(args);
  const tty = process.stdin.isTTY && process.stdout.isTTY;

  if (!scope) {
    if (!tty) {
      console.error(
        "corn help needs a pick. Try: corn help writer commands"
      );
      process.exit(2);
    }
    ({ scope, detail } = await promptHelpMenu());
  } else if (scope === "install") {
    detail = detail || "full";
  } else if (!detail) {
    // Scope from args but no detail → default to commands (skip second prompt)
    detail = "commands";
  }

  printHelp(doc, scope, detail);
}

function warnMissingScriptsDeps(cmd) {
  if (!NEEDS_SCRIPTS_DEPS.has(cmd)) return;
  const marker = path.join(here, "node_modules");
  if (fs.existsSync(marker)) return;
  console.error(
    `[corn] scripts/node_modules missing. From the repo root run:\n` +
      `  npm install --prefix scripts\n` +
      `(needed for corn ${cmd})\n`
  );
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
    // `corn` / `corn help` → prompt; `corn help writer|ship|all|install` skips it
    const helpArgs = !cmd || cmd === "help" ? rest : [];
    await usage(helpArgs);
    process.exit(0);
  }

  if (GIT_FLOW.has(cmd)) {
    const r = spawnSync(
      process.execPath,
      [path.join(here, "git-flow.mjs"), cmd, ...rest],
      { stdio: "inherit", cwd: root }
    );
    process.exit(r.status ?? 1);
  }

  const script = COMMANDS[cmd];
  if (!script) {
    console.error(`Unknown command: ${cmd}\n`);
    await usage(["all"]);
    process.exit(2);
  }

  warnMissingScriptsDeps(cmd);

  const r = spawnSync(process.execPath, [path.join(here, script), ...rest], {
    stdio: "inherit",
    cwd: root,
  });
  process.exit(r.status ?? 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
