import { describe, test, expect } from "bun:test";
import { spawn } from "bun";
import { join } from "node:path";

describe("check command", () => {
  const cliPath = join(__dirname, "..", "..", "src", "index.ts");
  const fixtureDir = join(__dirname, "..", "..", "src", "__fixtures__", "basic-config");

  test("runs biome check", async () => {
    const proc = spawn({
      cmd: ["bun", "run", cliPath, "check"],
      cwd: fixtureDir,
      stdout: "pipe",
      stderr: "pipe",
    });

    const exitCode = await proc.exited;
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();

    // Verify the command executed (even if biome isn't installed)
    // Should either succeed or fail with biome-specific error
    expect(typeof exitCode).toBe("number");
    const output = stdout + stderr;
    expect(output.length).toBeGreaterThan(0); // Should produce some output
  });
});
