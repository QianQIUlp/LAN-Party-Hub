#!/usr/bin/env node
import { rm } from "node:fs/promises";

await Promise.all([
  "Temp/e2e-room.json",
  "Temp/e2e-room.json.bak",
  "Temp/e2e-room.json.tmp"
].map((path) => rm(path, { force: true })));
