# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.5] - 2026-02-19

### Fixed

- Add `module` condition to all generated `exports` entries in `PackageExport` so newer Vite/rolldown bundlers resolving under conditions `["module", "browser", "development", "import"]` can correctly locate ESM entry points — previously `module` was absent, causing a "not exported under the conditions" error for packages with plugin sub-paths (e.g. `./plugins/react`)

## [1.0.4] - 2026-02-19

### Fixed

- Add `import` condition to all generated `exports` entries in `PackageExport` so bundlers and Vite can resolve ESM entry points under conditions like `["module", "browser", "import"]` — previously only `default` was emitted, which Vite's strict exports resolution did not match for plugin sub-paths (e.g. `./plugins/react`)

## [1.0.3] - 2026-02-06

### Fixed

- Fix CI release: invoke fot CLI binary directly instead of `bun x` which resolves to wrong npm package

## [1.0.2] - 2026-02-06

### Fixed

- Fix CI build: build toolchain (config + cli) before other libraries to ensure `fot` binary is available

## [1.0.1] - 2026-02-06

### Fixed

- Add .npmignore to ensure dist/ is included in npm tarball regardless of .gitignore settings

## [1.0.0] - 2026-02-02

### Added
- `typescript.maxMemory` configuration option for increasing TypeScript compiler memory during declaration generation
- Tests for `generateBiomeConfig` generator
- Tests for `generateTSConfig` generator

### Changed
- Stabilized all public APIs for 1.0.0 release

### Fixed
- `ResolvedFotConfig` type now correctly types `maxMemory` as optional
- Plugin export paths in `generatePackageJson` use correct subdirectory pattern (`plugins/<name>/index.js`)

## [0.1.0]

### Added
- `defineFotConfig()` factory function for FOT library configuration validation
- Config schema and types for build formats (ESM/CJS), external dependencies, TypeScript options, Biome options, and plugins
- `generateBiomeConfig()` for biome.json configuration generation
- `generatePackageJson()` for package.json generation with proper exports
- `generateTSConfig()` for tsconfig.json generation with TypeScript compiler options
- Zod-based configuration validation

[1.0.0]: https://github.com/F-O-T/libraries/compare/@f-o-t/config@0.1.0...@f-o-t/config@1.0.0
[0.1.0]: https://github.com/F-O-T/libraries/releases/tag/@f-o-t/config@0.1.0
