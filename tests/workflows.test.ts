import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("GitHub Actions workflows", () => {
  it("attaches a Windows portable artifact to every CI run", async () => {
    const [ciWorkflow, windowsWorkflow] = await Promise.all([
      readFile(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8"),
      readFile(new URL("../.github/workflows/windows-artifact.yml", import.meta.url), "utf8")
    ]);

    expect(ciWorkflow).toContain("uses: ./.github/workflows/windows-artifact.yml");
    expect(windowsWorkflow).toContain("workflow_call:");
    expect(windowsWorkflow).toContain("contents: read");
    expect(windowsWorkflow).toContain("uses: actions/upload-artifact@v4");
    expect(windowsWorkflow).toContain("name: LAN-Party-Hub-windows-x64");
  });

  it("keeps formal release publishing in the write-enabled release workflow", async () => {
    const releaseWorkflow = await readFile(
      new URL("../.github/workflows/release.yml", import.meta.url),
      "utf8"
    );

    expect(releaseWorkflow).toContain("uses: ./.github/workflows/windows-artifact.yml");
    expect(releaseWorkflow).toContain("uses: actions/download-artifact@v4");
    expect(releaseWorkflow).toContain("contents: write");
    expect(releaseWorkflow).toContain("uses: softprops/action-gh-release@v2");
  });
});
