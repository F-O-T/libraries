# Changelog

## [0.1.6] - 2026-02-06

### Changed

- Update internal dependencies to latest versions

## [0.1.5] - 2026-02-06

### Fixed

- Fix CI release: build all libraries upfront so cross-library type declarations are available

## [0.1.4] - 2026-02-06

### Fixed

- Fix CI release: invoke fot CLI binary directly instead of `bun x` which resolves to wrong npm package

## [0.1.3] - 2026-02-06

### Fixed

- Fix CI build: build toolchain (config + cli) before other libraries to ensure `fot` binary is available

## [0.1.2] - 2026-02-06

### Fixed

- Add .npmignore to ensure dist/ is included in npm tarball regardless of .gitignore settings

## [0.1.1] - 2026-02-06

### Fixed

- Add missing `"files": ["dist"]` to package.json — dist/ was excluded from published package due to .gitignore

## 0.1.0

### Features

- `calculateICMS()` for ICMS (state VAT) calculation
- Tax rate configuration and retrieval: ICMS state rates, ISS municipal rates, IPI, PIS, COFINS rates
- CFOP registry (Code of Fiscal Operations): `registerCFOP()`, `getCFOP()`, `validateCFOP()`, `getCFOPOperation()`
- NCM registry (trade nomenclature): `registerNCM()`, `getNCM()`, `validateNCM()`
- Comprehensive schemas and types for tax calculations, Brazilian states, and operation types
