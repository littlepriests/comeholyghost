import { test } from "node:test";
import assert from "node:assert/strict";
import {
    escapeHtml,
    fillTemplate,
    markdownToEmailHtml,
    parseFrontMatter,
    renderWelcomeEmail
} from "../../netlify/lib/email-templates.mjs";

test("parseFrontMatter reads key: value lines and strips quotes", () => {
    const { meta, body } = parseFrontMatter('---\nsubject: "hi there"\ngreeting: hey\n---\nbody text\n');
    assert.deepEqual(meta, { subject: "hi there", greeting: "hey" });
    assert.equal(body, "body text\n");
});

test("parseFrontMatter leaves text without front matter alone", () => {
    assert.deepEqual(parseFrontMatter("just text"), { meta: {}, body: "just text" });
});

test("fillTemplate replaces {{KEY}} but leaves Resend's {{{TRIPLE}}} tokens", () => {
    const out = fillTemplate("<p>{{TITLE}}</p>{{{RESEND_UNSUBSCRIBE_URL}}}", { TITLE: "x" });
    assert.equal(out, "<p>x</p>{{{RESEND_UNSUBSCRIBE_URL}}}");
});

test("escapeHtml escapes markup characters", () => {
    assert.equal(escapeHtml('<a href="x">&</a>'), "&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;");
});

test("markdownToEmailHtml absolutizes links", () => {
    const html = markdownToEmailHtml("see [the guestbook](/guestbook/)", {
        origin: "https://site.test/"
    });
    assert.match(html, /href="https:\/\/site\.test\/guestbook\/"/);
});

test("markdownToEmailHtml escapes plain paragraphs", () => {
    assert.equal(
        markdownToEmailHtml("a < b & c"),
        '<p style="margin:0 0 12px;">a &lt; b &amp; c</p>'
    );
});

test("markdownToEmailHtml escapes markup in a paragraph that also has a link", () => {
    const html = markdownToEmailHtml("[x](/x) <b>bold</b>");
    assert.match(html, /&lt;b&gt;bold&lt;\/b&gt;/);
    assert.doesNotMatch(html, /<b>/);
});

test("markdownToEmailHtml turns photo shortcodes into images and drops other shortcodes", () => {
    const md = '{{< photo src="cat.webp" caption="a cat" >}}\n\n{{< sprite id="x" >}}';
    const html = markdownToEmailHtml(md, { origin: "https://site.test" });
    assert.match(html, /<img src="https:\/\/site\.test\/cat\.webp"/);
    assert.match(html, /a cat/);
    assert.doesNotMatch(html, /\{\{</);
});

test("renderWelcomeEmail fills every template slot and links a personal unsubscribe", async () => {
    const { html, subject } = await renderWelcomeEmail({
        email: "A+b@Site.test",
        origin: "https://site.test"
    });
    assert.ok(subject.length > 0);
    assert.doesNotMatch(html, /\{\{[A-Z_]+\}\}/, "no unfilled {{SLOT}} left behind");
    assert.match(html, /https:\/\/site\.test\/unsubscribe\/\?email=a%2Bb%40site\.test/);
});
