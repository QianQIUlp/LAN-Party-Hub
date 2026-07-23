// Modified for LAN Party Hub; see CHANGES.md and NOTICE.md.
import { copyFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export interface JsonLoadResult<TValue> {
  value: TValue;
  source: "primary" | "backup" | "fallback";
  error?: string;
}

export class LocalJsonStore<TValue> {
  constructor(private readonly filePath: string) {}

  async load(fallbackValue: TValue): Promise<TValue> {
    return (await this.loadWithRecovery(fallbackValue)).value;
  }

  async loadWithRecovery(fallbackValue: TValue): Promise<JsonLoadResult<TValue>> {
    try {
      const raw = await readFile(this.filePath, "utf-8");
      return { value: JSON.parse(raw) as TValue, source: "primary" };
    } catch (primaryError) {
      try {
        const backupRaw = await readFile(`${this.filePath}.bak`, "utf-8");
        return {
          value: JSON.parse(backupRaw) as TValue,
          source: "backup",
          error: primaryError instanceof Error ? primaryError.message : String(primaryError)
        };
      } catch {
        return {
          value: fallbackValue,
          source: "fallback",
          error: primaryError instanceof Error ? primaryError.message : String(primaryError)
        };
      }
    }
  }

  async save(value: TValue): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.tmp`;
    const backupPath = `${this.filePath}.bak`;
    await writeFile(temporaryPath, JSON.stringify(value, null, 2), "utf-8");
    await copyFile(this.filePath, backupPath).catch(() => undefined);
    await rename(temporaryPath, this.filePath);
  }
}
