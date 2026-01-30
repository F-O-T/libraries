#!/usr/bin/env bun

console.log("FOT CLI v0.1.0");

// Export all commands and utilities
export { generateConfigFiles } from "./commands/generate";
export { buildCommand } from "./commands/build";
export { buildLibrary, type BuildOptions } from "./builder";
export { loadFotConfig, hasFotConfig } from "./config-loader";
