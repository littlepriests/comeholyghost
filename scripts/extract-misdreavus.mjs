import fs from "fs";

const raw = fs.readFileSync(
  "C:/Users/Alexa/.cursor/browser-logs/cdp-response-Runtime.evaluate-2026-11-08T22-12-27-357Z.json",
  "utf8"
);
const j = JSON.parse(raw);

function find(o) {
  if (!o || typeof o !== "object") return null;
  if (typeof o.dataUrl === "string" && o.dataUrl.startsWith("data:")) return o.dataUrl;
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

const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
fs.mkdirSync("static/images/sprites", { recursive: true });
fs.mkdirSync("assets-src/sprites", { recursive: true });
fs.writeFileSync("assets-src/sprites/misdreavus-sheet.png", Buffer.from(b64, "base64"));
console.log("wrote", fs.statSync("assets-src/sprites/misdreavus-sheet.png").size, "bytes");
