import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("GitHub Actions workflows", () => {
  it("attaches a Windows portable artifact to every CI run", async () => {
    const [ciWorkflow, releaseWorkflow] = await Promise.all([
      readFile(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8"),
      readFile(new URL("../.github/workflows/release.yml", import.meta.url), "utf8")
    ]);

    expect(ciWorkflow).toContain("uses: ./.github/workflows/release.yml");
    expect(releaseWorkflow).toContain("workflow_call:");
    expect(releaseWorkflow).toContain("uses: actions/upload-artifact@v4");
    expect(releaseWorkflow).toContain("name: LAN-Party-Hub-windows-x64");
  });

  it("publishes a formal release only for release-specific events", async () => {
    const releaseWorkflow = await readFile(
      new URL("../.github/workflows/release.yml", import.meta.url),
      "utf8"
    );

    expect(releaseWorkflow).toContain(
      "if: startsWith(github.ref, 'refs/tags/v') || github.event_name == 'workflow_dispatch'"
    );
  });
});
