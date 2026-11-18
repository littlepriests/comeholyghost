import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import guestbook from "../../netlify/functions/guestbook.mjs";
import visitors from "../../netlify/functions/visitors.mjs";
import { useStores } from "../../netlify/lib/stores.mjs";
import { memoryStore, withEnv } from "./helpers.mjs";

/* The two Blobs-backed functions, run against in-memory stores. */

let stores;
let restoreStores;
let restoreEnv;

beforeEach(() => {
    stores = new Map();
    restoreStores = useStores(async (name) => {
        if (!stores.has(name)) stores.set(name, memoryStore());
        return stores.get(name);
    });
    restoreEnv = withEnv({ CONTEXT: "production" });
});

afterEach(() => {
    restoreStores();
    restoreEnv();
});

function request(path, method = "GET", body) {
    const init = { method };
    if (body !== undefined) {
        init.headers = { "content-type": "application/json" };
        init.body = typeof body === "string" ? body : JSON.stringify(body);
    }
    return new Request(`https://site.test${path}`, init);
}

const sign = (body) => guestbook(request("/api/guestbook", "POST", body));
const saved = () => stores.get("guestbook")?.data.get("entries")?.value ?? [];

function noStores() {
    restoreStores();
    restoreStores = useStores(async (name) => {
        throw new Error(`unexpected store ${name}`);
    });
}

test("guestbook: an empty book reads as no entries", async () => {
    const res = await guestbook(request("/api/guestbook"));
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { entries: [] });
});

test("guestbook: a signature is cleaned, saved newest first, and returned", async () => {
    await sign({ name: "first", message: "hi" });
    const res = await sign({ name: "  Ada\u0007 ", message: "line one\r\nline two\u0000" });
    assert.equal(res.status, 201);
    const { entries } = await res.json();
    assert.deepEqual(entries.map((e) => [e.name, e.message]), [["Ada", "line one\nline two"], ["first", "hi"]]);
    assert.ok(!Number.isNaN(Date.parse(entries[0].at)));
    assert.deepEqual(saved(), entries);
});

test("guestbook: long fields are capped and the book keeps the newest 100", async () => {
    for (let i = 0; i < 101; i++) await sign({ name: `n${i}`, message: "" });
    const res = await sign({ name: "x".repeat(200), message: "y".repeat(900) });
    const { entries } = await res.json();
    assert.equal(entries.length, 100);
    assert.equal(entries[0].name.length, 80);
    assert.equal(entries[0].message.length, 500);
    assert.equal(entries.at(-1).name, "n2");
});

test("guestbook: a signature needs a name or a message", async () => {
    const res = await sign({ name: "  ", message: "" });
    assert.equal(res.status, 400);
    assert.deepEqual(saved(), []);
});

test("guestbook: a filled honeypot looks like success but saves nothing", async () => {
    const res = await sign({ name: "bot", message: "buy", website: "spam.biz" });
    assert.equal(res.status, 200);
    assert.deepEqual(saved(), []);
});

test("guestbook: a body that isn't JSON is a 400", async () => {
    assert.equal((await sign("{not json")).status, 400);
});

test("guestbook: other methods are refused and OPTIONS is a preflight", async () => {
    assert.equal((await guestbook(request("/api/guestbook", "DELETE"))).status, 405);
    assert.equal((await guestbook(request("/api/guestbook", "OPTIONS"))).status, 204);
});

test("guestbook: when every write conflicts, the visitor is told to retry", async () => {
    await sign({ name: "first" });
    stores.get("guestbook").setJSON = async () => ({ modified: false });
    assert.equal((await sign({ name: "second" })).status, 503);
});

test("guestbook: deploy previews never open the store", async () => {
    restoreEnv = ((outer, inner) => () => (inner(), outer()))(restoreEnv, withEnv({ CONTEXT: "deploy-preview" }));
    noStores();
    const read = await guestbook(request("/api/guestbook"));
    assert.deepEqual(await read.json(), { entries: [], preview: true });
    const write = await sign({ name: "a" });
    assert.equal(write.status, 200);
    assert.equal((await write.json()).preview, true);
});

const count = async (method) => (await (await visitors(request("/api/visitors", method))).json()).count;

test("visitors: the count starts at 0 and each POST adds one", async () => {
    assert.equal(await count("GET"), 0);
    assert.equal(await count("POST"), 1);
    assert.equal(await count("POST"), 2);
    assert.equal(await count("GET"), 2);
});

test("visitors: concurrent visits all count", async () => {
    await Promise.all(Array.from({ length: 5 }, () => count("POST")));
    assert.equal(await count("GET"), 5);
});

test("visitors: the older { count } shape and junk values both read sensibly", async () => {
    await count("GET");
    const store = stores.get("visitors");
    await store.setJSON("count", { count: 41.7 });
    assert.equal(await count("POST"), 42);
    await store.setJSON("count", "lots");
    assert.equal(await count("GET"), 0);
});

test("visitors: when every write conflicts, the counter says it's busy", async () => {
    await count("GET");
    stores.get("visitors").setJSON = async () => ({ modified: false });
    assert.equal((await visitors(request("/api/visitors", "POST"))).status, 503);
});

test("visitors: deploy previews never open the store", async () => {
    restoreEnv = ((outer, inner) => () => (inner(), outer()))(restoreEnv, withEnv({ CONTEXT: "branch-deploy" }));
    noStores();
    assert.deepEqual(await (await visitors(request("/api/visitors"))).json(), { count: 0, preview: true });
    assert.equal((await visitors(request("/api/visitors", "PUT"))).status, 405);
});
