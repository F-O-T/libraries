import { describe, test, expect, afterEach } from "bun:test";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { buildCommand } from "../../src/commands/build";

describe("build command", () => {
  const fixtureDir = join(__dirname, "..", "..", "src", "__fixtures__", "basic-config");
  const distDir = join(fixtureDir, "dist");

  afterEach(() => {
    if (existsSync(distDir)) {
      rmSync(distDir, { recursive: true, force: true });
    }
    const tsconfigPath = join(fixtureDir, "tsconfig.json");
    if (existsSync(tsconfigPath)) {
      rmSync(tsconfigPath);
    }
  });

  test("builds successfully with valid config", async () => {
    await buildCommand({ cwd: fixtureDir });
    expect(existsSync(distDir)).toBe(true);
  });
});
