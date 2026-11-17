import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import subscribe from "../../netlify/functions/subscribe.mjs";
import unsubscribe from "../../netlify/functions/unsubscribe.mjs";
import { unsubscribeQuery } from "../../netlify/lib/unsubscribe-token.mjs";
import { mockFetch, withEnv } from "./helpers.mjs";

const realFetch = globalThis.fetch;
let restoreEnv;

beforeEach(() => {
    restoreEnv = withEnv({
        CONTEXT: "production",
        URL: "https://site.test",
        RESEND_API_KEY: "re_test",
        RESEND_FROM: "site <hi@site.test>",
        RESEND_SEGMENT_ID: "seg_1",
        RESEND_NOTIFY_TO: "owner@site.test",
        UNSUBSCRIBE_SECRET: null
    });
});

afterEach(() => {
    globalThis.fetch = realFetch;
    restoreEnv();
});

function post(path, body) {
    return new Request(`https://site.test${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
    });
}

function noNetwork() {
    return mockFetch((url) => {
        throw new Error(`unexpected fetch to ${url}`);
    });
}

test("subscribe: only POST and OPTIONS are allowed", async () => {
    assert.equal((await subscribe(new Request("https://site.test/api/subscribe"))).status, 405);
    const pre = await subscribe(new Request("https://site.test/api/subscribe", { method: "OPTIONS" }));
    assert.equal(pre.status, 204);
});

test("subscribe: a filled honeypot looks like success but calls nothing", async () => {
    const calls = noNetwork();
    const res = await subscribe(post("/api/subscribe", { email: "bot@x.test", website: "spam.biz" }));
    assert.equal(res.status, 200);
    assert.equal(calls.length, 0);
});

test("subscribe: a bad address is a 400", async () => {
    noNetwork();
    assert.equal((await subscribe(post("/api/subscribe", { email: "nope" }))).status, 400);
});

test("subscribe: deploy previews never touch the real list", async () => {
    restoreEnv = ((outer, inner) => () => (inner(), outer()))(restoreEnv, withEnv({ CONTEXT: "deploy-preview" }));
    const calls = noNetwork();
    const res = await subscribe(post("/api/subscribe", { email: "a@b.co" }));
    assert.equal(res.status, 200);
    assert.equal((await res.json()).preview, true);
    assert.equal(calls.length, 0);
});

test("subscribe: missing Resend settings is a 503", async () => {
    restoreEnv = ((outer, inner) => () => (inner(), outer()))(restoreEnv, withEnv({ RESEND_SEGMENT_ID: null }));
    noNetwork();
    assert.equal((await subscribe(post("/api/subscribe", { email: "a@b.co" }))).status, 503);
});

test("subscribe: a new contact gets the owner ping and a welcome email", async () => {
    const calls = mockFetch((url) => (url.endsWith("/contacts") ? { status: 201 } : { status: 200 }));
    const res = await subscribe(post("/api/subscribe", { email: " New@B.co " }));
    assert.equal(res.status, 201);
    const routes = calls.map((c) => c.url.replace("https://api.resend.com", ""));
    assert.deepEqual(routes, ["/contacts", "/emails", "/emails"]);
    const welcome = JSON.parse(calls[2].init.body);
    assert.deepEqual(welcome.to, ["new@b.co"]);
    const link = unsubscribeQuery("re_test", "new@b.co");
    assert.match(welcome.headers["List-Unsubscribe"], new RegExp(link.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(welcome.html, new RegExp(link.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("subscribe: an owner-ping failure does not fail the subscriber", async () => {
    let emailCalls = 0;
    mockFetch((url) => {
        if (url.endsWith("/contacts")) return { status: 201 };
        emailCalls += 1;
        if (emailCalls === 1) throw new Error("notify blip");
        return { status: 200 };
    });
    assert.equal((await subscribe(post("/api/subscribe", { email: "a@b.co" }))).status, 201);
});

test("subscribe: an existing contact gets no second welcome", async () => {
    const calls = mockFetch(() => ({ status: 409 }));
    const res = await subscribe(post("/api/subscribe", { email: "a@b.co" }));
    assert.equal(res.status, 200);
    assert.equal(calls.length, 1);
});

test("unsubscribe: GET redirects people to the unsubscribe page, token unchanged", async () => {
    const q = unsubscribeQuery("re_test", "A@b.co");
    const res = await unsubscribe(new Request(`https://site.test/api/unsubscribe?${q}`));
    assert.equal(res.status, 302);
    assert.equal(res.headers.get("location"), `https://site.test/unsubscribe/?${q}`);
});

test("unsubscribe: a POST with no token, or a token for a different address, deletes nothing", async () => {
    const calls = noNetwork();
    assert.equal((await unsubscribe(post("/api/unsubscribe", { email: "a@b.co" }))).status, 403);
    const foreign = new URLSearchParams(unsubscribeQuery("re_test", "other@b.co")).get("token");
    assert.equal((await unsubscribe(post("/api/unsubscribe", { email: "a@b.co", token: foreign }))).status, 403);
    assert.equal(calls.length, 0);
});

test("unsubscribe: one-click POST with the signed query removes the contact", async () => {
    const calls = mockFetch(() => ({ status: 200 }));
    const res = await unsubscribe(
        new Request(`https://site.test/api/unsubscribe?${unsubscribeQuery("re_test", "a@b.co")}`, {
            method: "POST",
            body: "List-Unsubscribe=One-Click"
        })
    );
    assert.equal(res.status, 200);
    assert.equal(calls[0].url, "https://api.resend.com/contacts/a%40b.co");
});

test("unsubscribe: an address that is already gone still reads as success", async () => {
    mockFetch(() => ({ status: 404 }));
    const q = new URLSearchParams(unsubscribeQuery("re_test", "a@b.co"));
    const res = await unsubscribe(post("/api/unsubscribe", { email: "a@b.co", token: q.get("token") }));
    assert.equal(res.status, 200);
});
