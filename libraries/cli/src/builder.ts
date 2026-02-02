import { join } from "node:path";
import { writeFileSync } from "node:fs";
import { build as bunBuild } from "bun";
import { $ } from "bun";
import type { BuildFormat } from "@f-o-t/config";
import { generateTSConfig } from "@f-o-t/config";
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

  // Generate tsconfig.json from config to keep it in sync
  const tsconfig = generateTSConfig(config);
  writeFileSync(
    join(cwd, "tsconfig.json"),
    JSON.stringify(tsconfig, null, 2) + "\n"
  );

  // Collect all entry points (main + plugins)
  const entryPoints: string[] = [];

  // Main entry point
  const mainEntry = join(cwd, "src", "index.ts");
  entryPoints.push(mainEntry);

  // Plugin entry points
  for (const plugin of config.plugins) {
    if (plugin.enabled !== false) {
      const pluginEntry = join(cwd, "src", "plugins", plugin.name, "index.ts");
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

  // Generate TypeScript declarations if enabled
  if (config.typescript.declaration) {
    console.log("Generating TypeScript declarations...");
    try {
      // Configure Node memory limit if specified in config
      if (config.typescript.maxMemory) {
        await $`cd ${cwd} && NODE_OPTIONS='--max-old-space-size=${config.typescript.maxMemory}' bun tsc --emitDeclarationOnly --declaration --declarationMap --outDir dist --noEmit false`.quiet();
      } else {
        await $`cd ${cwd} && bun tsc --emitDeclarationOnly --declaration --declarationMap --outDir dist --noEmit false`.quiet();
      }
      console.log("✓ TypeScript declarations generated");
    } catch (error) {
      throw new Error(
        `Declaration generation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  if (watch) {
    const { watch: fsWatch } = await import("node:fs");
    const srcDir = join(cwd, "src");
    const configFile = join(cwd, "fot.config.ts");

    console.log(`Watching ${srcDir} and fot.config.ts for changes...`);

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let isBuilding = false;
    const watchers: ReturnType<typeof fsWatch>[] = [];

    const handleChange = (filename: string | null) => {
      if (!filename) return;
      
      const isTypeScript = filename.endsWith(".ts") || filename.endsWith(".tsx");
      const isConfig = filename === "fot.config.ts";
      
      if (!isTypeScript && !isConfig) return;

      if (debounceTimer) clearTimeout(debounceTimer);

      debounceTimer = setTimeout(async () => {
        if (isBuilding) {
          console.log("Build in progress, skipping...");
          return;
        }
        
        isBuilding = true;
        const timestamp = new Date().toLocaleTimeString();
        
        console.log(`\n[${timestamp}] File changed: ${filename}`);
        console.log("Rebuilding...");
        
        try {
          await buildLibrary({ cwd, watch: false });
          console.log("✓ Rebuild successful");
        } catch (error) {
          console.error(
            "✗ Rebuild failed:",
            error instanceof Error ? error.message : String(error)
          );
        } finally {
          isBuilding = false;
        }
      }, 300);
    };

    // Watch src directory
    watchers.push(fsWatch(srcDir, { recursive: true }, (_event, filename) => {
      handleChange(filename);
    }));

    // Watch config file
    watchers.push(fsWatch(configFile, (_event, filename) => {
      handleChange(filename);
    }));

    // Cleanup on exit
    const cleanup = () => {
      console.log("\nStopping watch mode...");
      watchers.forEach(w => w.close());
      if (debounceTimer) clearTimeout(debounceTimer);
      process.exit(0);
    };

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);

    // Keep process alive
    await new Promise(() => {});
  }
}
