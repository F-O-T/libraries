import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { BuildFormat } from "@f-o-t/config";
import { generateTSConfig } from "@f-o-t/config";
import { $, build as bunBuild } from "bun";
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
 * Sync the exports field in package.json to match the plugins defined in fot.config.ts.
 * Preserves all other package.json fields (version, dependencies, etc.).
 *
 * @param cwd - The library root directory
 * @param plugins - Resolved plugin configs from fot.config.ts
 */
function syncPackageJsonExports(
   cwd: string,
   plugins: Array<{ name: string; enabled?: boolean }>,
): void {
   const pkgPath = join(cwd, "package.json");
   if (!existsSync(pkgPath)) return;

   const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
      exports?: Record<string, unknown>;
      [key: string]: unknown;
   };

   // Rebuild exports: always keep the "." entry, then add plugin entries.
   // Include "module" and "import" conditions so Vite/rolldown resolving under
   // conditions like ["module", "browser", "development", "import"] can locate
   // ESM entry points without falling back to the catch-all "default".
   const exports: Record<string, unknown> = {
      ".": {
         types: "./dist/index.d.ts",
         module: "./dist/index.js",
         import: "./dist/index.js",
         default: "./dist/index.js",
      },
   };

   for (const plugin of plugins) {
      if (plugin.enabled !== false) {
         exports[`./plugins/${plugin.name}`] = {
            types: `./dist/plugins/${plugin.name}/index.d.ts`,
            module: `./dist/plugins/${plugin.name}/index.js`,
            import: `./dist/plugins/${plugin.name}/index.js`,
            default: `./dist/plugins/${plugin.name}/index.js`,
         };
      }
   }

   // Only write if exports actually changed
   const before = JSON.stringify(pkg.exports ?? {});
   const after = JSON.stringify(exports);
   if (before === after) return;

   pkg.exports = exports;
   writeFileSync(pkgPath, JSON.stringify(pkg, null, 3) + "\n");
   console.log("✓ package.json exports synced");
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
      JSON.stringify(tsconfig, null, 2) + "\n",
   );

   // Collect all entry points (main + plugins)
   const entryPoints: string[] = [];

   // Main entry point
   const mainEntry = join(cwd, "src", "index.ts");
   entryPoints.push(mainEntry);

   // Plugin entry points
   for (const plugin of config.plugins) {
      if (plugin.enabled !== false) {
         const pluginEntry = join(
            cwd,
            "src",
            "plugins",
            plugin.name,
            "index.ts",
         );
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
            `Build failed for ${format} format: ${error instanceof Error ? error.message : String(error)}`,
         );
      }
   }

   console.log("Build completed successfully!");

   // Sync package.json exports to match configured plugins
   syncPackageJsonExports(cwd, config.plugins);

   // Generate TypeScript declarations if enabled
   if (config.typescript.declaration) {
      console.log("Generating TypeScript declarations...");
      try {
         // Configure Node memory limit if specified in config
         if (config.typescript.maxMemory) {
            await $`cd ${cwd} && NODE_OPTIONS='--max-old-space-size=${config.typescript.maxMemory}' bun tsc --emitDeclarationOnly --declaration --declarationMap --outDir dist --noEmit false`;
         } else {
            await $`cd ${cwd} && bun tsc --emitDeclarationOnly --declaration --declarationMap --outDir dist --noEmit false`;
         }
         console.log("✓ TypeScript declarations generated");
      } catch (error) {
         throw new Error(
            `Declaration generation failed: ${error instanceof Error ? error.message : String(error)}`,
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

         const isTypeScript =
            filename.endsWith(".ts") || filename.endsWith(".tsx");
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
                  error instanceof Error ? error.message : String(error),
               );
            } finally {
               isBuilding = false;
            }
         }, 300);
      };

      // Watch src directory
      watchers.push(
         fsWatch(srcDir, { recursive: true }, (_event, filename) => {
            handleChange(filename);
         }),
      );

      // Watch config file
      watchers.push(
         fsWatch(configFile, (_event, filename) => {
            handleChange(filename);
         }),
      );

      // Cleanup on exit
      const cleanup = () => {
         console.log("\nStopping watch mode...");
         watchers.forEach((w) => w.close());
         if (debounceTimer) clearTimeout(debounceTimer);
         process.exit(0);
      };

      process.on("SIGINT", cleanup);
      process.on("SIGTERM", cleanup);

      // Keep process alive
      await new Promise(() => {});
   }
}
