// Modified for LAN Party Hub; see CHANGES.md and NOTICE.md.
import { randomUUID } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type Server as HttpServer, type ServerResponse } from "node:http";
import { extname, join, relative, resolve } from "node:path";
import { promisify } from "node:util";
import { gzip } from "node:zlib";
import type { PerfLogPayload } from "@open-party-lab/game-core";
import type { AppEnv } from "../../core/config/env.js";
import { serverPerfRegistry } from "../../core/perf/serverPerfRegistry.js";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type"
} as const;

const contentTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

const gzipAsync = promisify(gzip);
const compressibleWebExtensions = new Set([".css", ".html", ".js", ".json", ".svg"]);

async function serveWebAsset(
  webRoot: string,
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse
): Promise<boolean> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return false;
  }

  const isController = pathname === "/controller" || pathname.startsWith("/controller/");
  const surface = isController ? "controller" : "host";
  const surfacePath = isController ? pathname.replace(/^\/controller\/?/, "") : pathname.slice(1);
  const requestedPath = surfacePath || "index.html";
  const surfaceRoot = resolve(webRoot, surface);
  let filePath = resolve(surfaceRoot, requestedPath);

  if (relative(surfaceRoot, filePath).startsWith("..")) {
    return false;
  }

  try {
    if (!(await stat(filePath)).isFile()) {
      filePath = resolve(surfaceRoot, "index.html");
    }
  } catch {
    filePath = resolve(surfaceRoot, "index.html");
  }

  try {
    const body = await readFile(filePath);
    const extension = extname(filePath).toLowerCase();
    const acceptsGzip = request.headers["accept-encoding"]?.includes("gzip") ?? false;
    const shouldCompress = acceptsGzip && compressibleWebExtensions.has(extension);
    const responseBody = shouldCompress ? await gzipAsync(body, { level: 6 }) : body;
    response.writeHead(200, {
      "cache-control": extension === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
      "content-length": responseBody.byteLength,
      "content-type": contentTypes[extension] ?? "application/octet-stream",
      ...(compressibleWebExtensions.has(extension) ? { vary: "accept-encoding" } : {}),
      ...(shouldCompress ? { "content-encoding": "gzip" } : {})
    });
    response.end(request.method === "HEAD" ? undefined : responseBody);
    return true;
  } catch {
    return false;
  }
}

function writeJson(
  response: ServerResponse,
  statusCode: number,
  payload: unknown
): void {
  response.writeHead(statusCode, {
    ...corsHeaders,
    "content-type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;

    if (totalBytes > 2_000_000) {
      throw new Error("payload_too_large");
    }

    chunks.push(buffer);
  }

  const body = Buffer.concat(chunks).toString("utf-8");
  return body.length > 0 ? JSON.parse(body) : {};
}

function sanitizeFilePart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "unknown";
}

async function handlePerfLogRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
  try {
    const payload = (await readJsonBody(request)) as PerfLogPayload;
    const sourceKind =
      payload.sourceKind === "host" || payload.sourceKind === "controller" || payload.sourceKind === "server"
        ? payload.sourceKind
        : "host";
    const scope = sanitizeFilePart(
      typeof payload.sceneKey === "string"
        ? payload.sceneKey
        : typeof payload.routeKey === "string"
          ? payload.routeKey
          : sourceKind
    );
    const gameId = sanitizeFilePart(typeof payload.gameId === "string" ? payload.gameId : "unknown-game");
    const mapId = sanitizeFilePart(typeof payload.mapId === "string" ? payload.mapId : "unknown-map");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const directory = join(process.cwd(), "Temp", "perf-logs");
    const fileName = `${stamp}-${sourceKind}-${gameId}-${scope}-${mapId}-${randomUUID().slice(0, 8)}.json`;
    const filePath = join(directory, fileName);
    const enrichedPayload: PerfLogPayload = {
      ...payload,
      sourceKind,
      serverSnapshots: serverPerfRegistry.listSnapshots()
    };

    await mkdir(directory, { recursive: true });
    await writeFile(filePath, JSON.stringify(enrichedPayload, null, 2), "utf-8");

    writeJson(response, 201, {
      ok: true,
      file: `Temp/perf-logs/${fileName}`
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      writeJson(response, 400, { ok: false, error: "Ungueltiges JSON." });
      return;
    }

    if (error instanceof Error && error.message === "payload_too_large") {
      writeJson(response, 413, { ok: false, error: "Log-Datei ist zu gross." });
      return;
    }

    writeJson(response, 500, { ok: false, error: "Perf-Log konnte nicht gespeichert werden." });
  }
}

export interface ServerDiagnostics {
  roomCode: string | null;
  joinUrl: string | null;
  joinOrigins: string[];
  persistencePath: string;
}

export function createHttpServer(
  env: AppEnv,
  getDiagnostics: () => ServerDiagnostics = () => ({
    roomCode: null,
    joinUrl: null,
    joinOrigins: [],
    persistencePath: env.jsonSnapshotPath
  }),
  requestShutdown?: () => void
): HttpServer {
  return createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");

    if (request.method === "OPTIONS") {
      response.writeHead(204, corsHeaders);
      response.end();
      return;
    }

    if (url.pathname === "/debug/perf-log" && request.method === "POST") {
      void handlePerfLogRequest(request, response);
      return;
    }

    if (url.pathname === "/debug/perf-state" && request.method === "GET") {
      writeJson(response, 200, {
        ok: true,
        snapshots: serverPerfRegistry.listSnapshots()
      });
      return;
    }

    if (url.pathname === "/health") {
      writeJson(response, 200, {
        product: "LAN Party Hub",
        status: "ok",
        port: env.port,
        ...getDiagnostics()
      });
      return;
    }

    if (url.pathname === "/control/shutdown" && request.method === "POST") {
      const remoteAddress = request.socket.remoteAddress ?? "";
      const isLoopback = remoteAddress === "127.0.0.1" || remoteAddress === "::1" || remoteAddress === "::ffff:127.0.0.1";
      const token = request.headers["x-lan-party-hub-token"];

      if (!isLoopback || !env.launcherControlToken || token !== env.launcherControlToken) {
        writeJson(response, 403, { ok: false, error: "forbidden" });
        return;
      }

      writeJson(response, 202, { ok: true });
      setImmediate(() => requestShutdown?.());
      return;
    }

    if (env.webRoot) {
      void serveWebAsset(env.webRoot, url.pathname, request, response).then((served) => {
        if (!served && !response.headersSent) {
          writeJson(response, 404, { status: "not_found" });
        }
      });
      return;
    }

    writeJson(response, 200, {
      name: "lan-party-hub-server",
      status: "running",
      controllerOrigin: env.publicControllerOrigin
    });
  });
}
