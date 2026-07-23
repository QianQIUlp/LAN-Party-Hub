// Modified for LAN Party Hub; see CHANGES.md and NOTICE.md.
import { createApp } from "./app.js";

const app = createApp();

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(`[server:info] Received ${signal}; shutting down.`);

  try {
    await app.stop();
    process.exitCode = 0;
  } catch (error) {
    console.error("[server:error] Graceful shutdown failed.", error);
    process.exitCode = 1;
  }
}

process.once("SIGINT", () => {
  void shutdown("SIGINT");
});

process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});

app.start().catch((error: unknown) => {
  console.error("[server:error]", error);
  process.exitCode = 1;
});
