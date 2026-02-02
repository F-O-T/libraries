import { describe, test, expect, afterEach } from "bun:test";
import { existsSync, rmSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "bun";

describe("create command", () => {
  let tempDir: string;

  afterEach(() => {
    if (tempDir && existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("generates correct template files", async () => {
    tempDir = mkdtempSync(join(tmpdir(), "fot-create-test-"));
    
    const { getLibraryTemplate } = await import("../../src/templates/library");
    const templates = getLibraryTemplate("test-lib", "A test library");
    
    // Verify template structure
    expect(templates.fotConfig).toContain("defineFotConfig");
    expect(templates.fotConfig).toContain("@f-o-t/config");
    expect(templates.indexTs).toContain("function hello()");
    expect(templates.indexTs).toContain("@f-o-t/test-lib");
    expect(templates.indexTestTs).toContain("describe");
    expect(templates.indexTestTs).toContain("@f-o-t/test-lib");
    expect(templates.readme).toContain("# @f-o-t/test-lib");
    expect(templates.readme).toContain("A test library");
  });

  test("errors when library already exists", async () => {
    // This test is harder because createCommand calls process.exit
    // We test it via subprocess
    const { spawn } = await import("bun");

    tempDir = mkdtempSync(join(tmpdir(), "fot-create-test-"));
    const libDir = join(tempDir, "libraries", "existing");
    const { mkdirSync } = await import("node:fs");
    mkdirSync(libDir, { recursive: true });

    const cliPath = join(__dirname, "..", "..", "src", "index.ts");
    const proc = spawn({
      cmd: ["bun", "run", cliPath, "create", "existing", "A library"],
      cwd: tempDir,
      stdout: "pipe",
      stderr: "pipe",
    });

    const exitCode = await proc.exited;
    expect(exitCode).not.toBe(0);
  });
});
