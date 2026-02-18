import type { ResolvedFotConfig } from "../types";

/**
 * TypeScript configuration structure
 */
export interface TSConfig {
   compilerOptions: {
      allowImportingTsExtensions: boolean;
      declaration: boolean;
      isolatedDeclarations: boolean;
      module: string;
      moduleDetection: string;
      moduleResolution: string;
      noEmit: boolean;
      noFallthroughCasesInSwitch: boolean;
      noImplicitOverride: boolean;
      noPropertyAccessFromIndexSignature: boolean;
      noUncheckedIndexedAccess: boolean;
      noUnusedLocals: boolean;
      noUnusedParameters: boolean;
      skipLibCheck: boolean;
      strict: boolean;
      target: string;
      verbatimModuleSyntax: boolean;
   };
   exclude: string[];
   include: string[];
}

/**
 * Generate a tsconfig.json file from a resolved FOT configuration
 *
 * @param config - The resolved FOT configuration
 * @returns The generated tsconfig.json object
 */
export function generateTSConfig(config: ResolvedFotConfig): TSConfig {
   // Exclude plugin directories from main tsconfig so their dependencies
   // (e.g., @f-o-t/condition-evaluator) don't get type-checked in the main pass.
   // Plugin declarations are handled separately by the build system.
   const enabledPlugins = config.plugins.filter((p) => p.enabled !== false);
   const pluginExcludes = enabledPlugins.map((p) => `src/plugins/${p.name}`);

   return {
      compilerOptions: {
         allowImportingTsExtensions: true,
         declaration: config.typescript.declaration,
         isolatedDeclarations: config.typescript.isolatedDeclarations,
         module: "Preserve",
         moduleDetection: "force",
         moduleResolution: "bundler",
         noEmit: true,
         noFallthroughCasesInSwitch: true,
         noImplicitOverride: true,
         noPropertyAccessFromIndexSignature: false,
         noUncheckedIndexedAccess: true,
         noUnusedLocals: false,
         noUnusedParameters: false,
         skipLibCheck: true,
         strict: true,
         target: "ES2023",
         verbatimModuleSyntax: true,
      },
      exclude: ["node_modules", "dist", "bunup.config.ts", ...pluginExcludes],
      include: ["src/**/*"],
   };
}
