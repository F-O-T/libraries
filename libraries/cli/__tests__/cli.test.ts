import { describe, test, expect } from "bun:test";
import { spawn } from "bun";
import { join } from "node:path";

describe("CLI entry point", () => {
  const cliPath = join(__dirname, "..", "src", "index.ts");

  async function runCli(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const proc = spawn({
      cmd: ["bun", "run", cliPath, ...args],
      stdout: "pipe",
      stderr: "pipe",
    });

    const exitCode = await proc.exited;
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();

    return { stdout, stderr, exitCode };
  }

  test("--version prints version", async () => {
    const { stdout, exitCode } = await runCli(["--version"]);
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test("--help prints usage info", async () => {
    const { stdout, exitCode } = await runCli(["--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("fot");
    expect(stdout).toContain("build");
    expect(stdout).toContain("dev");
    expect(stdout).toContain("test");
    expect(stdout).toContain("check");
    expect(stdout).toContain("typecheck");
    expect(stdout).toContain("generate");
    expect(stdout).toContain("create");
  });

  test("unknown command exits with error", async () => {
    const { stderr, exitCode } = await runCli(["nonexistent"]);
    expect(exitCode).not.toBe(0);
    expect(stderr).toContain("nonexistent");
  });

  test("create without name exits with error", async () => {
    const { stderr, exitCode } = await runCli(["create"]);
    expect(exitCode).not.toBe(0);
  });
});
