import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: [
    {
      command: "PRIMARY_ROOM_CODE=E2E0 JSON_SNAPSHOT_PATH=../../Temp/e2e-room.json PUBLIC_CONTROLLER_ORIGIN=http://127.0.0.1:5174 npm run dev --workspace @open-party-lab/server",
      url: "http://127.0.0.1:3000/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000
    },
    {
      command: "VITE_SERVER_URL=http://127.0.0.1:3000 npm run dev --workspace @open-party-lab/host -- --host 127.0.0.1",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000
    },
    {
      command: "VITE_SERVER_URL=http://127.0.0.1:3000 npm run dev --workspace @open-party-lab/controller -- --host 127.0.0.1",
      url: "http://127.0.0.1:5174",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000
    }
  ]
});
