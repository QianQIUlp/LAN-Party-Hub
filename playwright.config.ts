import { defineConfig, devices } from "@playwright/test";

const serverPort = process.env.E2E_SERVER_PORT ?? "3000";
const hostPort = process.env.E2E_HOST_PORT ?? "5173";
const controllerPort = process.env.E2E_CONTROLLER_PORT ?? "5174";
const serverOrigin = "http://127.0.0.1:" + serverPort;
const hostOrigin = "http://127.0.0.1:" + hostPort;
const controllerOrigin = "http://127.0.0.1:" + controllerPort;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: hostOrigin,
    trace: process.env.CI ? "on-first-retry" : "off"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: [
    {
      command: "PORT=" + serverPort + " PRIMARY_ROOM_CODE=E2E0 JSON_SNAPSHOT_PATH=../../Temp/e2e-room.json PUBLIC_CONTROLLER_ORIGIN=" + controllerOrigin + " npm run dev --workspace @open-party-lab/server",
      url: serverOrigin + "/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000
    },
    {
      command: "VITE_SERVER_URL=" + serverOrigin + " npm run dev --workspace @open-party-lab/host -- --host 127.0.0.1 --port " + hostPort,
      url: hostOrigin,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000
    },
    {
      command: "VITE_SERVER_URL=" + serverOrigin + " npm run dev --workspace @open-party-lab/controller -- --host 127.0.0.1 --port " + controllerPort,
      url: controllerOrigin,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000
    }
  ]
});
