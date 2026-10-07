import { defineConfig } from "@playwright/test";
import { scryptSync } from "node:crypto";
const testDatabase = process.env.BOARDO_TEST_DATABASE_URL;
if (!testDatabase || !new URL(testDatabase).pathname.endsWith("_test")) throw new Error("Set BOARDO_TEST_DATABASE_URL to an isolated *_test database.");
export default defineConfig({
  testDir: "./tests/e2e", fullyParallel: false, workers: 1, timeout: 60000,
  use: { baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure", screenshot: "only-on-failure", browserName: "chromium", channel: process.env.PLAYWRIGHT_CHANNEL },
  webServer: { command: "npm run dev -- --hostname 127.0.0.1 --port 3100", url: "http://127.0.0.1:3100/login", timeout: 120000, reuseExistingServer: false,
    env: { DATABASE_URL: testDatabase, APP_URL: "http://127.0.0.1:3100", BOARDO_OWNER_EMAIL: "e2e@example.invalid", BOARDO_PASSWORD_HASH: `e2e-salt:${scryptSync("boardo-test-password", "e2e-salt", 64).toString("hex")}`, CRON_SECRET: "test-cron-secret", RESEND_API_KEY: "", DIGEST_EMAIL: "" } },
});
