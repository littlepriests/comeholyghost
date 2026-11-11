/**
 * Zip git-changed files for proj-zip sync (selective, not a full tree dump).
 *
 * Usage:
 *   node scripts/zip-changed.mjs
 *   node scripts/zip-changed.mjs --out ../personal-development.zip
 *   node scripts/zip-changed.mjs --commit HEAD
 *
 * Default file set: working tree changes (staged + unstaged + untracked).
 * If the tree is clean, falls back to paths touched by --commit (default HEAD).
 *
 * Always skips Vale style packs and other non-ship noise.
 */
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SKIP = [
  /(^|\/)Styles(\/|$)/i,
  /(^|\/)\.vale(\/|$|\.ini$)/i,
  /(^|\/)vale(\.exe)?$/i,
  /(^|\/)vale-rules(\/|$)/i,
  /(^|\/)node_modules(\/|$)/,
  /(^|\/)public(\/|$)/,
  /(^|\/)resources\/_gen(\/|$)/,
  /(^|\/)\.git(\/|$)/,
  /(^|\/)\.hugo_build\.lock$/,
  /(^|\/)\.cursor(\/|$)/,
  /\.zip$/i,
];

function norm(p) {
  return p.replace(/\\/g, "/").replace(/^\.\//, "");
}

function shouldSkip(rel) {
  const n = norm(rel);
  return SKIP.some((re) => re.test(n));
}

function gitLines(...args) {
  try {
    const out = execFileSync("git", args, { cwd: root, encoding: "utf8" });
    return out
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function parseArgs(argv) {
  let out = path.join(path.dirname(root), "personal-development.zip");
  let commit = "HEAD";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--out" && argv[i + 1]) {
      out = path.resolve(root, argv[++i]);
    } else if (argv[i] === "--commit" && argv[i + 1]) {
      commit = argv[++i];
    }
  }
  return { out, commit };
}

function collectWorkingTree() {
  const changed = new Set([
    ...gitLines("diff", "--name-only", "HEAD"),
    ...gitLines("diff", "--name-only", "--cached"),
    ...gitLines("ls-files", "--others", "--exclude-standard"),
  ]);
  return [...changed];
}

function collectCommit(commit) {
  return gitLines("show", "--name-only", "--pretty=format:", commit);
}

function main() {
  const { out, commit } = parseArgs(process.argv.slice(2));
  let files = collectWorkingTree().filter((f) => !shouldSkip(f));
  if (!files.length) {
    files = collectCommit(commit).filter((f) => !shouldSkip(f));
  }

  files = files
    .filter((f) => fs.existsSync(path.join(root, f)))
    .filter((f) => fs.statSync(path.join(root, f)).isFile())
    .sort();

  if (!files.length) {
    console.error("No changed files to zip (after Vale/noise filters).");
    process.exit(1);
  }

  if (fs.existsSync(out)) fs.unlinkSync(out);

  // PowerShell ZipFile keeps relative paths; Compress-Archive flattens badly.
  const psFiles = files.map((f) => f.replace(/'/g, "''")).join("','");
  const psOut = out.replace(/'/g, "''");
  const psRoot = root.replace(/'/g, "''");
  const ps = `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$root = '${psRoot}'
$out = '${psOut}'
$rel = @('${psFiles}')
if (Test-Path $out) { Remove-Item -Force $out }
$zip = [System.IO.Compression.ZipFile]::Open($out, 'Create')
try {
  foreach ($r in $rel) {
    $full = Join-Path $root $r
    $entry = ($r -replace '\\\\','/')
    [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
      $zip, $full, $entry,
      [System.IO.Compression.CompressionLevel]::Optimal
    )
  }
} finally {
  $zip.Dispose()
}
Write-Output ("files=" + $rel.Count)
Write-Output ("bytes=" + (Get-Item $out).Length)
`;

  execFileSync("powershell", ["-NoProfile", "-Command", ps], {
    cwd: root,
    stdio: "inherit",
  });

  console.log("Wrote", out);
  console.log("Included", files.length, "paths (Styles/Vale excluded by filter)");
  for (const f of files) console.log(" ", f);
}

main();
