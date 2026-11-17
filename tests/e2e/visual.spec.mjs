import { test, expect, settle, scrollToEnd } from "./fixtures.mjs";

/*
 * Screenshot baselines (@visual). Font rendering differs by OS, so these run
 * locally: `corn test --visual`. After an intentional look change, refresh with
 * `corn test --visual --update` and commit the new PNGs.
 */

const PAGES = [
    { name: "home", path: "/" },
    { name: "writing", path: "/blog/" },
    { name: "post", path: "/blog/crossroad-beauty/" },
    { name: "photobook", path: "/gallery/" },
    { name: "guestbook", path: "/guestbook/" },
    { name: "read-me", path: "/read-me/" }
];

for (const { name, path } of PAGES) {
    test(`${name} looks the same @visual`, async ({ page }) => {
        await page.goto(path);
        await settle(page);
        // Hugo shuffles the banner on every build.
        const mask = [page.locator("[data-home-banner]")];
        await expect(page).toHaveScreenshot(`${name}-top.png`, { mask });
        await scrollToEnd(page);
        await expect(page).toHaveScreenshot(`${name}-footer.png`, { mask });
    });
}

test("subscribe dialog looks the same @visual", async ({ page }) => {
    await page.goto("/blog/");
    await settle(page);
    await page.locator("[data-subscribe-open]").first().click();
    await expect(page.locator("[data-subscribe-dialog]")).toBeVisible();
    await expect(page).toHaveScreenshot("subscribe-dialog.png");
});
