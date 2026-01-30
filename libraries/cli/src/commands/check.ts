import { spawn } from "bun";

/**
 * Execute the check command
 * Runs Biome to check and fix code style issues
 */
export async function checkCommand(): Promise<void> {
  console.log("Running Biome check with auto-fix...");

  const proc = spawn({
    cmd: ["bunx", "biome", "check", "--write", "."],
    stdio: ["inherit", "inherit", "inherit"],
  });

  const exitCode = await proc.exited;

  if (exitCode === 0) {
    console.log("✓ Check completed successfully");
  } else {
    console.error("Check failed");
  }

  process.exit(exitCode);
}
