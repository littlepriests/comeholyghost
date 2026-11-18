import { test } from "node:test";
import assert from "node:assert/strict";
import { updateJSON } from "../../netlify/lib/blob-update.mjs";
import { memoryStore } from "./helpers.mjs";

test("updateJSON: creates a missing key", async () => {
    const store = memoryStore();
    const next = await updateJSON(store, "count", (value) => (value || 0) + 1);
    assert.equal(next, 1);
    assert.equal(store.data.get("count").value, 1);
});

test("updateJSON: concurrent bumps all land", async () => {
    const store = memoryStore();
    await Promise.all(Array.from({ length: 5 }, () => updateJSON(store, "count", (value) => (value || 0) + 1)));
    assert.equal(store.data.get("count").value, 5);
});

test("updateJSON: concurrent guestbook entries are all kept", async () => {
    const store = memoryStore();
    await Promise.all(
        ["a", "b", "c"].map((name) => updateJSON(store, "entries", (value) => [{ name }, ...(value || [])]))
    );
    const names = store.data.get("entries").value.map((e) => e.name).sort();
    assert.deepEqual(names, ["a", "b", "c"]);
});

test("updateJSON: gives up when every write conflicts", async () => {
    const store = memoryStore();
    store.setJSON = async () => ({ modified: false });
    await assert.rejects(updateJSON(store, "count", () => 1), /too many concurrent writes/);
});
