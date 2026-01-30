import { join } from "node:path";
import { build as bunBuild } from "bun";
import type { BuildFormat } from "@f-o-t/config";
import { loadFotConfig } from "./config-loader";

/**
 * Options for building a library
 */
export interface BuildOptions {
  /**
   * The working directory containing the fot.config.ts file
   * @default process.cwd()
   */
  cwd?: string;
  /**
   * Whether to watch for changes and rebuild
   * @default false
   */
  watch?: boolean;
}

/**
 * Build a library using Bun's bundler
 *
 * @param options - Build options
 * @throws {Error} If the build fails
 */
export async function buildLibrary(options: BuildOptions = {}): Promise<void> {
  const cwd = options.cwd || process.cwd();
  const watch = options.watch || false;

  console.log("Loading fot.config.ts...");
  const config = await loadFotConfig(cwd);

  // Collect all entry points (main + plugins)
  const entryPoints: string[] = [];

  // Main entry point
  const mainEntry = join(cwd, "src", "index.ts");
  entryPoints.push(mainEntry);

  // Plugin entry points
  for (const plugin of config.plugins) {
    if (plugin.enabled !== false) {
      const pluginEntry = join(cwd, "src", "plugins", `${plugin.name}.ts`);
      entryPoints.push(pluginEntry);
    }
  }

  console.log(`Building ${entryPoints.length} entry point(s)...`);

  // Iterate over formats and build each
  for (const format of config.formats) {
    console.log(`Building ${format} format...`);

    try {
      const result = await bunBuild({
        entrypoints: entryPoints,
        outdir: join(cwd, "dist"),
        target: "bun",
        format: format === "esm" ? "esm" : "cjs",
        splitting: format === "esm",
        minify: false,
        sourcemap: "external",
        external: config.external,
        naming: {
          entry: "[dir]/[name].js",
          chunk: "[name]-[hash].js",
        },
      });

      if (!result.success) {
        const errors = result.logs.map((log) => log.message).join("\n");
        throw new Error(`Build failed for ${format} format:\n${errors}`);
      }

      console.log(`✓ ${format} format built successfully`);
    } catch (error) {
      throw new Error(
        `Build failed for ${format} format: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  console.log("Build completed successfully!");

  if (watch) {
    console.log("Watching for changes...");
    // TODO: Implement watch mode in future
  }
}
