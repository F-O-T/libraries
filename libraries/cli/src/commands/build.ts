import { buildLibrary, type BuildOptions } from "../builder";

/**
 * Execute the build command
 *
 * @param options - Build options
 */
export async function buildCommand(options: BuildOptions = {}): Promise<void> {
  try {
    await buildLibrary(options);
  } catch (error) {
    console.error(
      "Build failed:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}
