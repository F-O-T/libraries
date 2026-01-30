#!/usr/bin/env bun

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

// Export all commands and utilities
export { generateConfigFiles } from "./commands/generate";
export { buildCommand } from "./commands/build";
export { buildLibrary, type BuildOptions } from "./builder";
export { loadFotConfig, hasFotConfig } from "./config-loader";

function printHelp() {
  console.log(`
FOT CLI - Build tools for monorepo libraries

Usage: fot <command> [options]

Commands:
  build              Build the current library
  dev                Start development mode with watch
  test               Run tests
    --watch          Run tests in watch mode
    --coverage       Run tests with coverage
  check              Run all checks (typecheck + test)
  typecheck          Run TypeScript type checking
  generate           Generate configuration files
  create <name>      Create a new library
    [description]    Optional description for the library
  help, --help, -h   Show this help message
  version, --version, -v  Show version number

Examples:
  fot build
  fot dev
  fot test --coverage
  fot test --watch
  fot create my-lib "A new library"
  fot generate
  fot check
`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case "build":
        await buildCommand();
        break;

      case "dev":
        await devCommand();
        break;

      case "test": {
        const options: TestOptions = {
          coverage: args.includes("--coverage"),
          watch: args.includes("--watch"),
        };
        await testCommand(options);
        break;
      }

      case "check":
        await checkCommand();
        break;

      case "typecheck":
        await typecheckCommand();
        break;

      case "generate":
        await generateConfigFiles();
        break;

      case "create": {
        const name = args[1];
        const description = args[2] || `A new FOT library: ${name}`;
        const options: CreateOptions = {
          name,
          description,
        };
        await createCommand(options);
        break;
      }

      case "help":
      case "--help":
      case "-h":
        printHelp();
        break;

      case "version":
      case "--version":
      case "-v":
        console.log("fot v0.1.0");
        break;

      case undefined:
        printHelp();
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.log('Run "fot --help" for usage information');
        process.exit(1);
    }
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
