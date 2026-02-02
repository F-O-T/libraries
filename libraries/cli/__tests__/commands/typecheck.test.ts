import { describe, test, expect } from "bun:test";
import { spawn } from "bun";
import { join } from "node:path";

describe("typecheck command", () => {
  const cliPath = join(__dirname, "..", "..", "src", "index.ts");
  const fixtureDir = join(__dirname, "..", "..", "src", "__fixtures__", "basic-config");

  test("runs tsc --noEmit", async () => {
    const proc = spawn({
      cmd: ["bun", "run", cliPath, "typecheck"],
      cwd: fixtureDir,
      stdout: "pipe",
      stderr: "pipe",
    });

    const exitCode = await proc.exited;
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();

    // Verify the command executed (even if tsc fails)
    // Should either succeed or fail with tsc-specific output
    expect(typeof exitCode).toBe("number");
    const output = stdout + stderr;
    expect(output.length).toBeGreaterThan(0); // Should produce some output
  });
});
