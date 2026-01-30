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
   return {
      compilerOptions: {
         allowImportingTsExtensions: true,
         declaration: config.typescript.declaration,
         isolatedDeclarations: false,
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
      exclude: ["node_modules", "dist", "bunup.config.ts"],
      include: ["src/**/*"],
   };
}
