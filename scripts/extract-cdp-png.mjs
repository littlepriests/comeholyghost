import fs from "fs";

const file = process.argv[2];
const out = process.argv[3];
if (!file || !out) {
  console.error("usage: node extract-cdp-png.mjs <cdp-json> <out.png>");
  process.exit(1);
}

const j = JSON.parse(fs.readFileSync(file, "utf8"));

function find(o) {
  if (!o || typeof o !== "object") return null;
  if (typeof o.dataUrl === "string" && o.dataUrl.startsWith("data:image")) return o.dataUrl;
  for (const k of Object.keys(o)) {
    const r = find(o[k]);
    if (r) return r;
  }
  return null;
}

const dataUrl = find(j);
if (!dataUrl) {
  console.error("no dataUrl");
  process.exit(1);
}

fs.mkdirSync(out.replace(/[^/\\]+$/, "") || ".", { recursive: true });
fs.writeFileSync(out, Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64"));
console.log("wrote", out, fs.statSync(out).size);
