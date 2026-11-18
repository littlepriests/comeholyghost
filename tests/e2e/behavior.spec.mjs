import { test, expect, settle, scrollToEnd, isPhone } from "./fixtures.mjs";

/* Behavior checks: platform-independent, so these also run in CI. */

test("same-site links swap the page without reloading, so music keeps playing", async ({ page }, testInfo) => {
    test.skip(isPhone(testInfo), "nav links are the same on phones; one run is enough");
    await page.goto("/");
    await settle(page);
    await page.evaluate(() => {
        window.__noReload = true;
        document.querySelector("#site-player audio").dataset.marker = "same-element";
    });

    await page.getByRole("link", { name: "writing" }).click();
    await expect(page).toHaveURL(/\/blog\/$/);
    await expect(page.locator("body")).not.toHaveClass(/\bhome\b/);
    await expect(page.locator("#site-player audio")).toHaveAttribute("data-marker", "same-element");
    expect(await page.evaluate(() => window.__noReload)).toBe(true);

    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("body")).toHaveClass(/\bhome\b/);
    expect(await page.evaluate(() => window.__noReload)).toBe(true);
});

test.describe("first visit", () => {
    test.use({ returning: false });

    test("Kagura's slash bumps the visitor count once", async ({ page, api }, testInfo) => {
        test.skip(isPhone(testInfo), "the dock pets are hidden below 45rem");
        await page.goto("/");
        await settle(page);
        await page.locator("[data-visitor-ticker]").scrollIntoViewIfNeeded();
        await expect(page.locator("[data-visitor-count]")).toHaveText("43", { timeout: 8000 });
        await expect(page.locator("[data-visitor-kagura]")).toHaveClass(/is-idle/, { timeout: 8000 });
        const posts = api.filter((c) => c.path === "/api/visitors" && c.method === "POST");
        expect(posts).toHaveLength(1);
    });
});

test("returning visitors see the count without bumping it", async ({ page, api }) => {
    await page.goto("/");
    await settle(page);
    await scrollToEnd(page);
    await expect(page.locator("[data-visitor-count]")).toHaveText("42");
    await page.waitForTimeout(1500);
    expect(api.filter((c) => c.path === "/api/visitors" && c.method === "POST")).toHaveLength(0);
});

test("clicking Sango throws the boomerang and knocks Kagura down, then both recover", async ({ page }, testInfo) => {
    test.skip(isPhone(testInfo), "the dock pets are hidden below 45rem");
    await page.goto("/");
    await settle(page);
    await scrollToEnd(page);
    const kagura = page.locator("[data-visitor-kagura]");
    const sango = page.locator("[data-dock-sango]");
    await expect(kagura).toHaveClass(/is-idle/);

    await sango.click();
    await expect(sango).toHaveClass(/is-busy/);
    await expect(kagura).toHaveClass(/is-down/, { timeout: 4000 });
    await expect(kagura).toHaveClass(/is-idle/, { timeout: 6000 });
    await expect(sango).not.toHaveClass(/is-busy/, { timeout: 6000 });
});

test("the player floats while reading and parks on the footer line at the end", async ({ page }) => {
    await page.goto("/blog/crossroad-beauty/");
    await settle(page);
    const player = page.locator("#site-player");
    const title = page.locator("[data-player-title]");
    await expect(player).not.toHaveClass(/site-player--parked/);
    await expect(title).toBeHidden();

    await scrollToEnd(page);
    await expect(player).toHaveClass(/site-player--parked/);
    await expect(title).toBeVisible();
    await expect.poll(() => page.evaluate(() => {
        const box = (sel) => document.querySelector(sel).getBoundingClientRect();
        const label = box("[data-player-title]");
        const buttons = box(".player-chrome__buttons");
        const dx = Math.abs((label.left + label.right) / 2 - (buttons.left + buttons.right) / 2);
        return label.bottom <= buttons.top + 1 && dx < 2;
    })).toBe(true);
    // Every width: bar (left gutter), then the footer lead, then the ↑ (right gutter).
    await expect.poll(() => page.evaluate(() => {
        const box = (sel) => document.querySelector(sel).getBoundingClientRect();
        const bar = box("[data-player-bar]");
        const lead = box("[data-footer-lead]");
        const up = box("[data-player-back-top]");
        return bar.right <= lead.left && lead.right <= up.left;
    }), { timeout: 3000 }).toBe(true);
});

test("the ↑ button appears after scrolling and returns to the top", async ({ page }) => {
    await page.goto("/blog/crossroad-beauty/");
    await settle(page);
    const up = page.locator("[data-player-back-top]");
    await expect(up).toBeHidden();

    await scrollToEnd(page);
    await expect(up).toBeVisible();
    await up.click();
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 8000 }).toBe(0);
});

test("the stop button hides the player and the ♡ brings it back", async ({ page }) => {
    await page.goto("/blog/");
    await settle(page);
    // While floating, phones show only play/pause; the full bar is on the footer line.
    await scrollToEnd(page);
    const player = page.locator("#site-player");
    await page.locator("[data-player-stop]").click();
    await expect(player).toHaveClass(/site-player--closed/);
    await page.locator("[data-player-reopen]").click();
    await expect(player).not.toHaveClass(/site-player--closed/);
});

test("subscribe opens from the nav and posts the address", async ({ page, api }) => {
    await page.goto("/blog/");
    await settle(page);
    await page.locator("[data-subscribe-open]").first().click();
    const dialog = page.locator("[data-subscribe-dialog]");
    await expect(dialog).toBeVisible();
    await dialog.locator('input[name="email"]').fill("reader@example.com");
    await dialog.locator("[data-subscribe-submit]").click();
    await expect(dialog.locator("[data-subscribe-ok]")).toContainText("on the list");
    const sent = api.find((c) => c.path === "/api/subscribe");
    expect(JSON.parse(sent.body)).toEqual({ email: "reader@example.com", website: "" });
});

test("Enter in the subscribe field subscribes instead of closing the dialog", async ({ page, api }) => {
    await page.goto("/blog/");
    await settle(page);
    await page.locator("[data-subscribe-open]").first().click();
    const dialog = page.locator("[data-subscribe-dialog]");
    await dialog.locator('input[name="email"]').fill("reader@example.com");
    await dialog.locator('input[name="email"]').press("Enter");
    await expect(dialog.locator("[data-subscribe-ok]")).toContainText("on the list");
    await expect(dialog).toBeVisible();
    expect(api.filter((c) => c.path === "/api/subscribe")).toHaveLength(1);
});

test("after a same-site swap, focus moves to the new page's main content", async ({ page }, testInfo) => {
    test.skip(isPhone(testInfo), "nav links are the same on phones; one run is enough");
    await page.goto("/");
    await settle(page);
    await page.getByRole("link", { name: "writing" }).click();
    await expect(page).toHaveURL(/\/blog\/$/);
    await expect(page.locator("main")).toBeFocused();
});

test("the unsubscribe page does nothing without the link from the email", async ({ page, api }) => {
    await page.goto("/unsubscribe/");
    await settle(page);
    await expect(page.locator("[data-unsubscribe-error]")).toContainText("unsubscribe link");
    await expect(page.locator("[data-unsubscribe-submit]")).toBeDisabled();
    await page.locator("[data-unsubscribe-form]").evaluate((form) => form.requestSubmit());
    expect(api.filter((c) => c.path === "/api/unsubscribe")).toHaveLength(0);
});

const PAGES = ["/", "/blog/", "/blog/crossroad-beauty/", "/gallery/", "/guestbook/", "/read-me/", "/unsubscribe/"];

test("every page has the same head scripts and styles and the same chrome outside #page-root", async ({ page }, testInfo) => {
    // SPA nav keeps those from the first page loaded, so a page-only one would go missing or linger.
    test.skip(isPhone(testInfo), "markup check; one run is enough");
    await page.goto("/unsubscribe/");
    const shapes = await page.evaluate(async (paths) => {
        const out = [];
        for (const path of paths) {
            const doc = new DOMParser().parseFromString(await (await fetch(path)).text(), "text/html");
            out.push({
                path,
                head: [...doc.head.querySelectorAll("style, script")].map((node) => node.outerHTML),
                chrome: [...doc.body.children].filter((node) => node.id !== "page-root").map((node) => node.outerHTML),
            });
        }
        return out;
    }, PAGES);
    const [first, ...rest] = shapes;
    for (const shape of rest) {
        expect(shape.head, `${shape.path} <head> vs ${first.path}`).toEqual(first.head);
        expect(shape.chrome, `${shape.path} chrome vs ${first.path}`).toEqual(first.chrome);
    }
});

test("the star trail follows the pointer on the homepage only, however you get there", async ({ page }, testInfo) => {
    test.skip(isPhone(testInfo), "the trail is desktop-only");
    const trail = page.locator("body > canvas");
    await page.goto("/blog/");
    await settle(page);
    await page.evaluate(() => (window.__noReload = true));
    await expect(trail).toHaveCount(0);

    await page.getByRole("link", { name: "i wanna go home" }).click();
    await expect(page.locator("body")).toHaveClass(/\bhome\b/);
    await expect(trail).toHaveCount(1);

    await page.getByRole("link", { name: "writing" }).first().click();
    await expect(page).toHaveURL(/\/blog\/$/);
    await expect(trail).toHaveCount(0);
    expect(await page.evaluate(() => window.__noReload)).toBe(true);
});

test("no page logs a script error", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));
    for (const path of PAGES) {
        await page.goto(path);
        await settle(page);
    }
    expect(errors).toEqual([]);
});
