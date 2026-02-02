import { describe, test, expect } from "bun:test";
import { spawn } from "bun";
import { join } from "node:path";

describe("test command", () => {
  const cliPath = join(__dirname, "..", "..", "src", "index.ts");
  const fixtureDir = join(__dirname, "..", "..", "src", "__fixtures__", "basic-config");

  test("runs bun test", async () => {
    // Run the test command in the fixture dir (which has no tests)
    const proc = spawn({
      cmd: ["bun", "run", cliPath, "test"],
      cwd: fixtureDir,
      stdout: "pipe",
      stderr: "pipe",
    });

    const exitCode = await proc.exited;
    const stderr = await new Response(proc.stderr).text();

    // bun test with no test files exits 1 (not 0 as spec suggested)
    expect(exitCode).toBe(1);
    expect(stderr).toContain("0 test files");
  });
});
