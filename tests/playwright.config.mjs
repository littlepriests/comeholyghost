import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";

const PORT = 1414;
const siteRoot = fileURLToPath(new URL("..", import.meta.url));

export default defineConfig({
    testDir: "e2e",
    snapshotPathTemplate: "{testDir}/__screenshots__/{projectName}/{arg}{ext}",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [["github"], ["list"]] : "list",
    expect: {
        toHaveScreenshot: {
            animations: "disabled",
            caret: "hide",
            maxDiffPixelRatio: 0.002
        }
    },
    use: {
        baseURL: `http://127.0.0.1:${PORT}`,
        trace: "retain-on-failure"
    },
    projects: [
        {
            name: "desktop",
            use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } }
        },
        {
            name: "phone",
            use: { ...devices["Pixel 7"] }
        }
    ],
    webServer: {
        command: `hugo server --port ${PORT} --bind 127.0.0.1 --baseURL http://127.0.0.1:${PORT}/ --disableLiveReload --renderToMemory --minify --logLevel error`,
        cwd: siteRoot,
        url: `http://127.0.0.1:${PORT}/`,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000
    }
});
