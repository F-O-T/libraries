# Changelog

All notable changes to @f-o-t/cli will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-01-30

### Added

- **Build command** (`fot build`) - Compile TypeScript libraries with optimized bundling using bunup
- **Dev command** (`fot dev`) - Watch mode for rapid development with automatic rebuilds
- **Test command** (`fot test`) - Run tests with Bun's native test runner
  - `--watch` flag for continuous testing during development
  - `--coverage` flag to generate test coverage reports
- **Check command** (`fot check`) - Format and lint code with Biome auto-fix
- **Typecheck command** (`fot typecheck`) - Run TypeScript type checking without building
- **Generate command** (`fot generate`) - Generate configuration files (package.json, tsconfig.json, biome.json) from fot.config.ts
- **Create command** (`fot create <name> [description]`) - Scaffold new libraries with complete boilerplate including:
  - Directory structure with src/ folder
  - fot.config.ts configuration file
  - Example source code (src/index.ts)
  - Sample test file (src/index.test.ts)
  - README.md documentation template
  - Auto-generated configuration files
  - Automatic dependency installation
- **Help command** (`fot help`, `fot --help`, `fot -h`) - Display comprehensive help information
- **Version command** (`fot version`, `fot --version`, `fot -v`) - Display CLI version number
- Configuration loader for reading and validating fot.config.ts files
- Builder utilities for optimized TypeScript compilation
- Library scaffolding templates for consistent project structure
- Comprehensive error handling and user-friendly output
- Integration with @f-o-t/config for configuration management
- Full TypeScript support with type declarations
- CI/CD-ready commands with proper exit codes

### Features

- Monorepo-aware design for managing multiple libraries
- Fast builds powered by bunup bundler
- Watch mode for both development and testing
- Test coverage reporting
- Automatic configuration generation from single source of truth
- Consistent library scaffolding with best practices
- Clear command-line interface with helpful feedback
- Seamless integration with Bun runtime
- Full compatibility with GitHub Actions and other CI/CD platforms

### Documentation

- Comprehensive README with detailed command documentation
- Quick start guide for new users
- Configuration examples and best practices
- CI/CD integration examples with GitHub Actions
- Troubleshooting guide for common issues
- Development setup instructions
- Project structure documentation
