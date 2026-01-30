import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "bun";
import { getLibraryTemplate } from "../templates/library";
import { generateConfigFiles } from "./generate";

/**
 * Options for creating a new library
 */
export interface CreateOptions {
  /**
   * Name of the library (e.g., "my-library")
   */
  name: string;
  /**
   * Brief description of the library
   */
  description: string;
  /**
   * Working directory (defaults to process.cwd())
   */
  cwd?: string;
}

/**
 * Create a new library with scaffolded files
 *
 * @param options - Create options
 */
export async function createCommand(options: CreateOptions): Promise<void> {
  const { name, description, cwd = process.cwd() } = options;

  console.log(`Creating library: @f-o-t/${name}`);
  console.log(`Description: ${description}`);

  // Determine library path
  const libraryPath = join(cwd, "libraries", name);

  // Check if library already exists
  if (existsSync(libraryPath)) {
    console.error(`Error: Library already exists at ${libraryPath}`);
    process.exit(1);
  }

  // Create directory structure
  console.log("\nCreating directory structure...");
  const srcPath = join(libraryPath, "src");
  mkdirSync(srcPath, { recursive: true });
  console.log(`✓ Created ${srcPath}`);

  // Get templates
  console.log("\nGenerating template files...");
  const templates = getLibraryTemplate(name, description);

  // Write fot.config.ts
  const fotConfigPath = join(libraryPath, "fot.config.ts");
  writeFileSync(fotConfigPath, templates.fotConfig);
  console.log(`✓ Created ${fotConfigPath}`);

  // Write src/index.ts
  const indexTsPath = join(srcPath, "index.ts");
  writeFileSync(indexTsPath, templates.indexTs);
  console.log(`✓ Created ${indexTsPath}`);

  // Write src/index.test.ts
  const indexTestTsPath = join(srcPath, "index.test.ts");
  writeFileSync(indexTestTsPath, templates.indexTestTs);
  console.log(`✓ Created ${indexTestTsPath}`);

  // Write README.md
  const readmePath = join(libraryPath, "README.md");
  writeFileSync(readmePath, templates.readme);
  console.log(`✓ Created ${readmePath}`);

  // Generate configuration files
  console.log("\nGenerating configuration files...");
  await generateConfigFiles(libraryPath);

  // Run bun install
  console.log("\nInstalling dependencies...");
  const installProc = spawn({
    cmd: ["bun", "install"],
    cwd: libraryPath,
    stdio: ["inherit", "inherit", "inherit"],
  });

  const exitCode = await installProc.exited;

  if (exitCode !== 0) {
    console.error("Failed to install dependencies");
    process.exit(exitCode);
  }

  console.log("✓ Dependencies installed");

  // Show next steps
  console.log("\n" + "=".repeat(60));
  console.log("✓ Library created successfully!");
  console.log("=".repeat(60));
  console.log("\nNext steps:");
  console.log(`  1. cd libraries/${name}`);
  console.log("  2. Edit src/index.ts to implement your library");
  console.log("  3. Add tests in src/index.test.ts");
  console.log("  4. Run 'bun test' to verify tests pass");
  console.log("  5. Run 'bun run build' to build the library");
  console.log("\nHappy coding! 🚀");
}
