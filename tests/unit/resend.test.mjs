import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
    addContact,
    errorMessage,
    resendConfigured,
    unsubscribeContact,
    verifyResendWebhook
} from "../../netlify/lib/resend.mjs";
import { mockFetch } from "./helpers.mjs";

const realFetch = globalThis.fetch;
afterEach(() => {
    globalThis.fetch = realFetch;
});

const cfg = { apiKey: "re_test", from: "site <hi@x.test>", segmentId: "seg_1" };

const SECRET_KEY = Buffer.from("not-a-real-key-just-for-tests");
const SECRET = `whsec_${SECRET_KEY.toString("base64")}`;

function signedHeaders(body, { id = "msg_1", ts = Math.floor(Date.now() / 1000), key = SECRET_KEY } = {}) {
    const sig = createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest("base64");
    return { "svix-id": id, "svix-timestamp": String(ts), "svix-signature": `v1,${sig}` };
}

test("resendConfigured needs a key, a sender, and a segment", () => {
    assert.equal(resendConfigured(cfg), true);
    assert.equal(resendConfigured({ ...cfg, segmentId: "" }), false);
    assert.equal(resendConfigured(null), false);
});

test("webhook signature: a correctly signed body parses", () => {
    const body = JSON.stringify({ type: "contact.created" });
    assert.deepEqual(verifyResendWebhook(body, signedHeaders(body), SECRET), { type: "contact.created" });
});

test("webhook signature: a tampered body, a wrong key, or a stale timestamp is refused", () => {
    const body = JSON.stringify({ type: "contact.created" });
    const headers = signedHeaders(body);
    assert.throws(() => verifyResendWebhook(body + " ", headers, SECRET), /no matching signature/);
    assert.throws(
        () => verifyResendWebhook(body, signedHeaders(body, { key: Buffer.from("other") }), SECRET),
        /no matching signature/
    );
    const stale = signedHeaders(body, { ts: Math.floor(Date.now() / 1000) - 3600 });
    assert.throws(() => verifyResendWebhook(body, stale, SECRET), /tolerance/);
    assert.throws(() => verifyResendWebhook(body, {}, SECRET), /missing svix headers/);
    assert.throws(() => verifyResendWebhook(body, headers, ""), /missing webhook secret/);
});

test("addContact: 2xx is a new contact, 409 is an existing one, anything else fails", async () => {
    const calls = mockFetch(() => ({ status: 201, body: { id: "c_1" } }));
    assert.deepEqual(await addContact(cfg, "a@b.co"), {
        ok: true,
        created: true,
        status: 201,
        body: { id: "c_1" }
    });
    assert.equal(calls[0].url, "https://api.resend.com/contacts");
    assert.equal(calls[0].init.headers.Authorization, "Bearer re_test");
    assert.deepEqual(JSON.parse(calls[0].init.body).segments, [{ id: "seg_1" }]);

    mockFetch(() => ({ status: 409, body: { message: "exists" } }));
    const again = await addContact(cfg, "a@b.co");
    assert.equal(again.ok, true);
    assert.equal(again.created, false);

    mockFetch(() => ({ status: 500, body: { message: "boom" } }));
    assert.equal((await addContact(cfg, "a@b.co")).ok, false);
});

test("unsubscribeContact DELETEs the encoded, lowercased address", async () => {
    const calls = mockFetch(() => ({ status: 200, body: {} }));
    await unsubscribeContact(cfg, " A+b@C.co ");
    assert.equal(calls[0].url, "https://api.resend.com/contacts/a%2Bb%40c.co");
    assert.equal(calls[0].init.method, "DELETE");
});

test("errorMessage prefers the API's message, then error, then the fallback", () => {
    assert.equal(errorMessage({ body: { message: "m" } }, "f"), "m");
    assert.equal(errorMessage({ body: { error: "e" } }, "f"), "e");
    assert.equal(errorMessage({ body: {} }, "f"), "f");
    assert.equal(errorMessage(null, "f"), "f");
});
