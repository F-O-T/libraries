import { spawn } from "bun";

/**
 * Execute the typecheck command
 * Runs TypeScript compiler to check for type errors
 */
export async function typecheckCommand(): Promise<void> {
  console.log("Running TypeScript type checking...");

  const proc = spawn({
    cmd: ["bunx", "tsc", "--noEmit"],
    stdio: ["inherit", "inherit", "inherit"],
  });

  const exitCode = await proc.exited;

  if (exitCode === 0) {
    console.log("✓ Type checking completed successfully");
  } else {
    console.error("Type checking failed");
  }

  process.exit(exitCode);
}
