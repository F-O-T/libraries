# Changelog

## [1.0.4] - 2026-02-06

### Fixed

- Fix CI release: invoke fot CLI binary directly instead of `bun x` which resolves to wrong npm package

## [1.0.3] - 2026-02-06

### Fixed

- Fix CI build: build toolchain (config + cli) before other libraries to ensure `fot` binary is available

## [1.0.2] - 2026-02-06

### Fixed

- Add .npmignore to ensure dist/ is included in npm tarball regardless of .gitignore settings

## [1.0.1] - 2026-02-06

### Fixed

- Add missing `"files": ["dist"]` to package.json — dist/ was excluded from published package due to .gitignore

## 1.0.0

### Features

- DOM parser with full namespace support
- XML serializer with formatting options
- SAX-like streaming parser for large documents
- XPath query engine with path expressions and predicates
- W3C Exclusive XML Canonicalization 1.0 (C14N)
- Zod schema validation for configuration
