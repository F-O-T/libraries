import type { ResolvedFotConfig } from "../types";

/**
 * Package.json export configuration
 */
export interface PackageExport {
   types: string;
   default: string;
}

/**
 * Package.json structure
 */
export interface PackageJson {
   name: string;
   version: string;
   type: "module";
   main: string;
   types: string;
   exports: Record<string, PackageExport>;
   scripts: Record<string, string>;
   dependencies?: Record<string, string>;
   devDependencies: Record<string, string>;
   repository: {
      type: "git";
      url: string;
      directory: string;
   };
}

/**
 * Generate a package.json file from a resolved FOT configuration
 *
 * @param libraryName - The name of the library (without @f-o-t/ prefix)
 * @param version - The version of the library
 * @param config - The resolved FOT configuration
 * @param customDependencies - Optional custom dependencies to include
 * @returns The generated package.json object
 */
export function generatePackageJson(
   libraryName: string,
   version: string,
   config: ResolvedFotConfig,
   customDependencies?: Record<string, string>,
): PackageJson {
   // Generate exports for main entry point
   const exports: Record<string, PackageExport> = {
      ".": {
         types: "./dist/index.d.ts",
         default: "./dist/index.js",
      },
   };

   // Generate exports for each plugin
   for (const plugin of config.plugins) {
      if (plugin.enabled !== false) {
         exports[`./plugins/${plugin.name}`] = {
            types: `./dist/plugins/${plugin.name}.d.ts`,
            default: `./dist/plugins/${plugin.name}.js`,
         };
      }
   }

   // Build package.json structure
   const pkg: PackageJson = {
      name: `@f-o-t/${libraryName}`,
      version,
      type: "module",
      main: "./dist/index.js",
      types: "./dist/index.d.ts",
      exports,
      scripts: {
         build: "fot build",
         test: "fot test",
         lint: "fot lint",
         format: "fot format",
      },
      devDependencies: {
         "@f-o-t/cli": "workspace:*",
         "@f-o-t/config": "workspace:*",
      },
      repository: {
         type: "git",
         url: "https://github.com/F-O-T/libraries.git",
         directory: `libraries/${libraryName}`,
      },
   };

   // Add custom dependencies if provided
   if (customDependencies && Object.keys(customDependencies).length > 0) {
      pkg.dependencies = customDependencies;
   }

   return pkg;
}
