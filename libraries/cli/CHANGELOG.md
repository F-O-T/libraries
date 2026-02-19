# Changelog

All notable changes to @f-o-t/cli will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.4] - 2026-02-19

### Fixed

- Add `import` condition to all generated `exports` entries in `package.json` so bundlers and Vite (which resolves under conditions like `["module", "browser", "import"]`) can locate ESM entry points — previously only `default` was emitted, causing a "not exported under the conditions" error for plugin sub-paths (e.g. `./plugins/react`)

## [1.0.3] - 2026-02-19

### Fixed

- `fot build` now automatically syncs the `exports` field in `package.json` after every build, ensuring plugin entry points declared in `fot.config.ts` (e.g. `plugins: ["react"]`) are always reflected in the published package manifest — previously they were only written by `fot generate`, causing Vite/Rolldown to fail resolving `./dist/plugins/<name>/index.js` with a "not exported under the conditions" error

## [1.0.2] - 2026-02-06

### Changed

- Update internal dependencies to latest versions

## [1.0.1] - 2026-02-06

### Fixed

- Add .npmignore to ensure dist/ is included in npm tarball regardless of .gitignore settings

## [1.0.0] - 2026-02-02

### Added
- File watching for `fot dev` command — watches `src/` for `.ts` changes and rebuilds automatically
- Full test coverage for all commands, builder, config-loader, templates, and CLI entry point
- Commander-based CLI with proper `--help` auto-generation and option parsing
- Dynamic version reading from `package.json` (no more hardcoded version strings)

### Changed
- Migrated CLI argument parsing from manual `switch` to `commander` library
- `fot check` help text now correctly describes it as "Format and lint code with Biome"

### Removed
- Hardcoded `"fot v0.1.0"` version string (now reads from package.json)

### Fixed
- `fot check` documentation mismatch — help text previously said "typecheck + test" but implementation runs Biome
- Watch mode TODO stub replaced with working implementation

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

[1.0.3]: https://github.com/F-O-T/libraries/compare/@f-o-t/cli@1.0.2...@f-o-t/cli@1.0.3
[1.0.2]: https://github.com/F-O-T/libraries/compare/@f-o-t/cli@1.0.1...@f-o-t/cli@1.0.2
[1.0.1]: https://github.com/F-O-T/libraries/compare/@f-o-t/cli@1.0.0...@f-o-t/cli@1.0.1
[1.0.0]: https://github.com/F-O-T/libraries/releases/tag/@f-o-t/cli@1.0.0
[0.1.0]: https://github.com/F-O-T/libraries/releases/tag/@f-o-t/cli@0.1.0
