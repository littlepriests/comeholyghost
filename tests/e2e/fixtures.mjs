import { test as base, expect } from "@playwright/test";

/**
 * Every test gets:
 * - Math.random seeded, so stars, hearts, and bubbles land in the same spots each run.
 * - /api/* stubbed: plain `hugo server` has no Netlify functions, and tests must
 *   never reach the real visitor count or mailing list.
 * - `returning` (default true): marks this session as already visited, so Kagura
 *   starts parked instead of playing the first-visit slash.
 */
export const test = base.extend({
    visitorCount: [42, { option: true }],
    returning: [true, { option: true }],
    api: [async ({ page, visitorCount }, use) => {
        const calls = [];
        let count = visitorCount;
        await page.route("**/api/**", async (route) => {
            const req = route.request();
            const path = new URL(req.url()).pathname;
            calls.push({ method: req.method(), path, body: req.postData() });
            if (path === "/api/visitors") {
                if (req.method() === "POST") count += 1;
                return route.fulfill({ json: { count } });
            }
            if (path === "/api/subscribe") {
                return route.fulfill({ status: 201, json: { message: "you're on the list. check your inbox for a hello." } });
            }
            return route.fulfill({ status: 404, json: { error: "not stubbed" } });
        });
        await use(calls);
    }, { auto: true }],
    page: async ({ page, returning }, use) => {
        await page.addInitScript(({ returning }) => {
            let seed = 0x5eed;
            Math.random = () => {
                seed = (seed + 0x6d2b79f5) | 0;
                let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
                t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
                return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
            };
            if (returning) sessionStorage.setItem("pd-visitor-seen", "1");
        }, { returning });
        await use(page);
    }
});

export { expect };

/** Fonts loaded, in-view images decoded, homepage banner revealed, layout scripts done. */
export async function settle(page) {
    await page.waitForLoadState("networkidle");
    await page.evaluate(async () => {
        await document.fonts.ready;
        const inView = [...document.images].filter((img) => {
            const r = img.getBoundingClientRect();
            return r.bottom > 0 && r.top < innerHeight && r.width > 0;
        });
        await Promise.all(inView.map((img) => (img.complete ? null : img.decode().catch(() => null))));
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    });
    if (await page.locator(".home-banner").count()) {
        await expect(page.locator(".home-banner")).not.toHaveClass(/is-pending/);
    }
}

/** Lazy images grow the page as they arrive, so scroll until the height holds. */
export async function scrollToEnd(page) {
    let last = -1;
    for (let i = 0; i < 10; i++) {
        const height = await page.evaluate(() => {
            window.scrollTo(0, document.documentElement.scrollHeight);
            return document.documentElement.scrollHeight;
        });
        await settle(page);
        if (height === last) return;
        last = height;
    }
}

export const isPhone = (testInfo) => testInfo.project.name === "phone";
