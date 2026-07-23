#!/usr/bin/env node
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const marker = "Modified for LAN Party Hub; see CHANGES.md and NOTICE.md.";
const command = process.argv[2] ?? "check";
const baseIndex = process.argv.indexOf("--base");
const base = baseIndex >= 0 ? process.argv[baseIndex + 1] : null;
const ledgerPath = resolve(root, "config/upstream-modified-files.json");
const baselinePath = resolve(root, "config/upstream-derived-files.json");

function git(args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr.trim() || `git ${args.join(" ")} failed`);
  return result.stdout.trim();
}

function commentFor(path) {
  const extension = extname(path).toLowerCase();
  if ([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".cs"].includes(extension)) return `// ${marker}`;
  if ([".md", ".html", ".htm", ".xml", ".svg"].includes(extension)) return `<!-- ${marker} -->`;
  if ([".yml", ".yaml", ".ps1", ".sh"].includes(extension) || [".gitignore", ".env.example"].includes(path)) return `# ${marker}`;
  return null;
}

function isExcluded(path) {
  return (
    path === "LICENSE" ||
    path === "NOTICE.md" ||
    path === "CHANGES.md" ||
    path === "config/upstream-modified-files.json" ||
    path.endsWith("package-lock.json") ||
    /\.(png|jpe?g|gif|webp|ico|woff2?|zip|pdf)$/i.test(path)
  );
}

async function readLedger() {
  return JSON.parse(await readFile(ledgerPath, "utf8"));
}

async function readBaseline() {
  return new Set(JSON.parse(await readFile(baselinePath, "utf8")));
}

async function addNotice(path) {
  const notice = commentFor(path);
  if (!notice) return false;
  const filePath = resolve(root, path);
  let content = await readFile(filePath, "utf8");
  if (content.slice(0, 500).includes(marker)) return false;

  const bom = content.startsWith("\uFEFF") ? "\uFEFF" : "";
  if (bom) content = content.slice(1);
  const lines = content.split(/(?<=\n)/);
  const insertAt = lines[0]?.startsWith("#!") ? 1 : 0;
  lines.splice(insertAt, 0, `${notice}\n`);
  await writeFile(filePath, bom + lines.join(""), "utf8");
  return true;
}

async function changedExistingFiles(baseRef) {
  if (!baseRef) return [];
  git(["rev-parse", "--verify", baseRef]);
  const changed = git(["diff", "--name-only", "--diff-filter=ACMRT", baseRef, "--"]);
  if (!changed) return [];
  return changed.split("\n").filter((path) => {
    const existsAtBase = spawnSync("git", ["cat-file", "-e", `${baseRef}:${path}`], { cwd: root }).status === 0;
    return existsAtBase && existsSync(resolve(root, path));
  });
}

async function mark() {
  if (!base) throw new Error("mark requires --base <git-ref>");
  const ledger = await readLedger();
  const baseline = await readBaseline();
  const paths = new Set([
    ...(await changedExistingFiles(base)).filter((path) => baseline.has(path)),
    ...ledger.filter((entry) => entry.noticeMode === "inline").map((entry) => entry.path)
  ]);
  let changed = 0;
  for (const path of paths) {
    if (!isExcluded(path) && await addNotice(path)) changed += 1;
  }
  console.log(`[legal] added modification notices to ${changed} file(s).`);
}

async function check() {
  const errors = [];
  const license = await readFile(resolve(root, "LICENSE"), "utf8");
  const notice = await readFile(resolve(root, "NOTICE.md"), "utf8");
  const sources = await readFile(resolve(root, "THIRD_PARTY_SOURCES.md"), "utf8");
  const knownGames = JSON.parse(await readFile(resolve(root, "config/known-games.json"), "utf8"));
  const ledger = await readLedger();
  const baseline = await readBaseline();

  if (!license.includes("Apache License") || !license.includes("Version 2.0, January 2004")) errors.push("Root LICENSE is not the expected Apache-2.0 text.");
  if (!notice.includes("Upstream Open Party Lab notice (preserved)") || !notice.includes("independently maintained derivative")) errors.push("NOTICE.md is missing preserved upstream or derivative attribution.");

  const bundled = knownGames.filter((game) => game.includeInRelease === true);
  if (bundled.length !== 4) errors.push(`Expected 4 bundled games, found ${bundled.length}.`);
  for (const game of bundled) {
    if (!game.sourceRepo || !/^[0-9a-f]{40}$/.test(game.sourceRevision ?? "")) errors.push(`${game.id} is missing fixed source provenance.`);
    if (!existsSync(resolve(root, game.bundledPath ?? "", "LICENSE"))) errors.push(`${game.id} is missing its retained LICENSE.`);
    if (!sources.includes(game.sourceRevision ?? "")) errors.push(`${game.id} revision is missing from THIRD_PARTY_SOURCES.md.`);
  }

  const ledgerPaths = new Set(ledger.map((entry) => entry.path));
  if (baseline.size === 0 || !baseline.has("LICENSE") || !baseline.has("apps/server/src/app.ts")) {
    errors.push("Upstream-derived baseline is empty or invalid.");
  }
  for (const entry of ledger) {
    const path = resolve(root, entry.path);
    if (!existsSync(path)) {
      errors.push(`Modification ledger path does not exist: ${entry.path}`);
      continue;
    }
    if (entry.noticeMode === "inline") {
      const content = await readFile(path, "utf8");
      if (!content.slice(0, 500).includes(marker)) errors.push(`Missing inline modification notice: ${entry.path}`);
    } else if (entry.noticeMode !== "ledger" || !entry.reason) {
      errors.push(`Ledger-only entry needs a reason: ${entry.path}`);
    }
  }

  for (const path of await changedExistingFiles(base)) {
    if (!baseline.has(path) && !ledgerPaths.has(path)) continue;
    if (isExcluded(path)) continue;
    const expectedComment = commentFor(path);
    if (!expectedComment) {
      if (!ledgerPaths.has(path)) errors.push(`Changed comment-free file is missing from the modification ledger: ${path}`);
      continue;
    }
    const content = await readFile(resolve(root, path), "utf8");
    if (!content.slice(0, 500).includes(marker)) errors.push(`Changed upstream-derived file lacks modification notice: ${path}`);
  }

  if (errors.length > 0) {
    for (const error of errors) console.error(`[legal] ${error}`);
    process.exit(1);
  }
  console.log(`[legal] attribution and modification notices verified${base ? ` against ${base}` : ""}.`);
}

if (command === "mark") await mark();
else if (command === "check") await check();
else throw new Error(`Unknown command: ${command}`);
