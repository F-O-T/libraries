#!/usr/bin/env bun

import { Command } from "commander";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildCommand,
  devCommand,
  testCommand,
  checkCommand,
  typecheckCommand,
  generateConfigFiles,
  createCommand,
  type TestOptions,
  type CreateOptions,
} from "./commands/index";

// Re-export public API
export { generateConfigFiles } from "./commands/generate";
export { buildCommand } from "./commands/build";
export { buildLibrary, type BuildOptions } from "./builder";
export { loadFotConfig, hasFotConfig } from "./config-loader";

// Read version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8"));

const program = new Command();

program
  .name("fot")
  .description("Build tools for FOT monorepo libraries")
  .version(pkg.version);

program
  .command("build")
  .description("Build the current library")
  .action(async () => {
    await buildCommand();
  });

program
  .command("dev")
  .description("Start development mode with file watching")
  .action(async () => {
    await devCommand();
  });

program
  .command("test")
  .description("Run tests")
  .option("--watch", "Run tests in watch mode")
  .option("--coverage", "Run tests with coverage")
  .action(async (options: TestOptions) => {
    await testCommand(options);
  });

program
  .command("check")
  .description("Format and lint code with Biome")
  .action(async () => {
    await checkCommand();
  });

program
  .command("typecheck")
  .description("Run TypeScript type checking")
  .action(async () => {
    await typecheckCommand();
  });

program
  .command("generate")
  .description("Generate config files from fot.config.ts")
  .action(async () => {
    await generateConfigFiles(process.cwd());
  });

program
  .command("create <name>")
  .description("Scaffold a new library")
  .argument("[description]", "Description for the library", "A new FOT library")
  .action(async (name: string, description: string) => {
    const options: CreateOptions = { name, description };
    await createCommand(options);
  });

program.parse();
