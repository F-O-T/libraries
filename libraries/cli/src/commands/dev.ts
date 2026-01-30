import { buildLibrary } from "../builder";

/**
 * Execute the dev command
 * Runs the build in watch mode for development
 */
export async function devCommand(): Promise<void> {
  try {
    console.log("Starting development mode...");
    await buildLibrary({ watch: true });
  } catch (error) {
    console.error(
      "Development mode failed:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}
