import { test } from "node:test";
import assert from "node:assert/strict";
import {
    escapeHtml,
    fillTemplate,
    markdownToEmailHtml,
    parseFrontMatter,
    publishedImageUrl,
    renderWelcomeEmail
} from "../../netlify/lib/email-templates.mjs";
import { unsubscribeQuery } from "../../netlify/lib/unsubscribe-token.mjs";
import { withEnv } from "./helpers.mjs";

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

test("static newsletter images use the site root, not the post folder", () => {
    const base = "https://site.test/blog/crossroad-beauty";
    assert.match(
        publishedImageUrl("images/nongrid/text.webp", base, { email: true }),
        /^https:\/\/site\.test\/images\/nongrid\/text(_hu_[a-z0-9]+)?\.webp$/
    );
    assert.match(
        publishedImageUrl("/images/nongrid/peachtree-gran-amaral.webp", base, { email: true }),
        /^https:\/\/site\.test\/images\/nongrid\/peachtree-gran-amaral(_hu_[a-z0-9]+)?\.webp$/
    );
});

test("page-bundle newsletter images stay on the processed post url", () => {
    const url = publishedImageUrl("amaral-red-qi.webp", "https://site.test/blog/crossroad-beauty", {
        email: true
    });
    assert.match(url, /^https:\/\/site\.test\/blog\/crossroad-beauty\/amaral-red-qi(_hu_[a-z0-9]+)?\.webp$/);
});

test("markdownToEmailHtml keeps figcaption images and static photo paths", () => {
    const html = markdownToEmailHtml(
        '{{< photo src="images/nongrid/text.webp" caption="kyle" />}}\n\n{{< figcaption src="/images/nongrid/peachtree-gran-amaral.webp" caption="muro" />}}',
        { origin: "https://site.test", assetBase: "https://site.test/blog/crossroad-beauty" }
    );
    assert.match(html, /src="https:\/\/site\.test\/images\/nongrid\/text(_hu_[a-z0-9]+)?\.webp"/);
    assert.match(html, /src="https:\/\/site\.test\/images\/nongrid\/peachtree-gran-amaral(_hu_[a-z0-9]+)?\.webp"/);
    assert.match(html, /kyle/);
    assert.match(html, /muro/);
    assert.doesNotMatch(html, /\/blog\/crossroad-beauty\/images\//);
});

test("renderWelcomeEmail fills every template slot and links a personal unsubscribe", async () => {
    const restore = withEnv({ UNSUBSCRIBE_SECRET: "test-secret" });
    try {
        const { html, subject } = await renderWelcomeEmail({
            email: "A+b@Site.test",
            origin: "https://site.test"
        });
        assert.ok(subject.length > 0);
        assert.doesNotMatch(html, /\{\{[A-Z_]+\}\}/, "no unfilled {{SLOT}} left behind");
        const link = unsubscribeQuery("test-secret", "a+b@site.test");
        assert.match(html, new RegExp(link.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    } finally {
        restore();
    }
});
