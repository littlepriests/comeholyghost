import { test } from "node:test";
import assert from "node:assert/strict";
import { EMAIL_RE, MAX_EMAIL, cleanEmail, json, preflight, readPayload } from "../../netlify/lib/http.mjs";

test("cleanEmail trims, lowercases, strips control characters, and caps length", () => {
    assert.equal(cleanEmail("  Hi@Example.COM \n"), "hi@example.com");
    assert.equal(cleanEmail("a\u0000b@c\u001F.io"), "ab@c.io");
    assert.equal(cleanEmail(null), "");
    assert.equal(cleanEmail("x".repeat(500)).length, MAX_EMAIL);
});

test("EMAIL_RE accepts plain addresses and rejects obvious junk", () => {
    for (const ok of ["a@b.co", "first.last+tag@sub.example.org"]) {
        assert.ok(EMAIL_RE.test(ok), ok);
    }
    for (const bad of ["", "a@b", "a b@c.io", "@c.io", "a@.io x"]) {
        assert.ok(!EMAIL_RE.test(bad), bad);
    }
});

test("json responses are never cached", async () => {
    const res = json(418, { hi: 1 });
    assert.equal(res.status, 418);
    assert.equal(res.headers.get("cache-control"), "no-store");
    assert.deepEqual(await res.json(), { hi: 1 });
});

test("preflight is an empty 204 with Allow", () => {
    const res = preflight("POST, OPTIONS");
    assert.equal(res.status, 204);
    assert.equal(res.headers.get("allow"), "POST, OPTIONS");
});

test("readPayload reads JSON bodies and form bodies", async () => {
    const asJson = new Request("https://x.test/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "a@b.co" })
    });
    assert.deepEqual(await readPayload(asJson), { email: "a@b.co" });

    const asForm = new Request("https://x.test/", {
        method: "POST",
        body: new URLSearchParams({ email: "a@b.co", website: "" })
    });
    assert.deepEqual(await readPayload(asForm), { email: "a@b.co", website: "" });
});

test("readPayload reads a urlencoded body with no content type, as one-click unsubscribe sends", async () => {
    const bare = new Request("https://x.test/", { method: "POST", body: "List-Unsubscribe=One-Click" });
    bare.headers.delete("content-type");
    assert.deepEqual(await readPayload(bare), { "List-Unsubscribe": "One-Click" });
});

test("readPayload treats an empty body or non-object JSON as no fields, and throws on bad JSON", async () => {
    assert.deepEqual(await readPayload(new Request("https://x.test/", { method: "POST" })), {});
    for (const body of ["null", "[1,2]", "7"]) {
        const req = new Request("https://x.test/", { method: "POST", headers: { "content-type": "application/json" }, body });
        assert.deepEqual(await readPayload(req), {}, body);
    }
    const bad = new Request("https://x.test/", { method: "POST", headers: { "content-type": "application/json" }, body: "{" });
    await assert.rejects(readPayload(bad));
});
