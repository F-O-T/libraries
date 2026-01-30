import { spawn } from "bun";

/**
 * Options for the test command
 */
export interface TestOptions {
  /**
   * Whether to generate coverage reports
   * @default false
   */
  coverage?: boolean;
  /**
   * Whether to watch for changes and re-run tests
   * @default false
   */
  watch?: boolean;
}

/**
 * Execute the test command
 *
 * @param options - Test options
 */
export async function testCommand(options: TestOptions = {}): Promise<void> {
  const args = ["test"];

  if (options.coverage) {
    args.push("--coverage");
  }

  if (options.watch) {
    args.push("--watch");
  }

  console.log(`Running: bun ${args.join(" ")}`);

  const proc = spawn({
    cmd: ["bun", ...args],
    stdio: ["inherit", "inherit", "inherit"],
  });

  const exitCode = await proc.exited;
  process.exit(exitCode);
}
