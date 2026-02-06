# Changelog

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

- Core PDF document and page operations
- Font management system
- PDF writer for content generation
- PDF parsing with lexer, parser, and reader
- PDF generation capabilities
- Object creation utilities
- Comprehensive error handling: PDFParseError, PDFGenerationError, InvalidPDFObjectError, FontNotFoundError, InvalidImageError, PDFSignatureError, PDFEncryptionError
