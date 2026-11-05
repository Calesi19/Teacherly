import { defineConfig, devices } from "@playwright/test";

// Same two variables the client and the server read, so moving the dev client
// off a busy 5173 is a single `DEV_CLIENT_PORT=5174` rather than three edits.
const CLIENT_PORT = process.env["DEV_CLIENT_PORT"] ?? "5173";
const API_PORT = process.env["PORT"] ?? "3000";

const CLIENT_URL = `http://localhost:${CLIENT_PORT}`;
const API_URL = `http://127.0.0.1:${API_PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 1 : 0,
  workers: 1,
  reporter: process.env["CI"] ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: CLIENT_URL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  // Two entries, started in order: the API (with its database and migrations)
  // has to be answering before the client is worth starting.
  webServer: [
    {
      command: "node scripts/dev.mjs --api-only",
      url: `${API_URL}/api/health`,
      reuseExistingServer: !process.env["CI"],
      timeout: 180_000,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: "pnpm --filter @teacherly/web dev",
      url: CLIENT_URL,
      reuseExistingServer: !process.env["CI"],
      timeout: 120_000,
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
});
