# Changelog

## [0.3.2] - 2026-02-14

### Fixed
- Fixed text rendering appearing upside-down/mirrored by flipping Y-axis in text matrix: `1 0 0 -1 x (pageHeight - y)`

## [0.3.1] - 2026-02-14

### Fixed
- Changed text positioning from `Td` (translate) to `Tm` (text matrix) operator

## [0.3.0] - 2026-02-14

### Added
- `parseResourcesDict()` function to parse Resources dictionaries from page content, handling both inline dictionaries and indirect object references
- `mergeResourcesDicts()` function to merge Resources dictionaries, preserving all existing entries while adding new ones

### Fixed
- Visual signature appearances now merge with existing page Resources instead of replacing them, preserving all original fonts and resource types
- Fixed corruption of PDFs with CIDFont fonts (common in @react-pdf/renderer) when adding visual signature
- Fixed indirect Resources references being replaced instead of resolved and merged

## [0.2.0] - 2026-02-13

### Added

- Editing plugin (`@f-o-t/pdf/plugins/editing`) for loading and modifying existing PDFs
- `loadPdf()` function to load a PDF from `Uint8Array` and return a `PdfDocument`
- `PdfDocument` type with `pageCount`, `getPage()`, `embedPng()`, `save()`, and `saveWithPlaceholder()`
- `PdfPage` type with `drawText()`, `drawRectangle()`, and `drawImage()` for page modifications
- Incremental update support: modifications are appended after the original PDF content
- Signature placeholder support via `saveWithPlaceholder()` with DocMDP, AcroForm, and widget annotations
- Signature utility functions: `findByteRange()`, `extractBytesToSign()`, `embedSignature()`
- PNG image embedding support via `embedPng()`

### Changed

- Removed `@f-o-t/digital-certificate` dependency (editing plugin replaces the PDF manipulation code that was in digital-certificate)

## [0.1.5] - 2026-02-06

### Changed

- Update internal dependencies to latest versions

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

[0.3.2]: https://github.com/F-O-T/libraries/compare/@f-o-t/pdf@0.3.1...@f-o-t/pdf@0.3.2
[0.3.1]: https://github.com/F-O-T/libraries/compare/@f-o-t/pdf@0.3.0...@f-o-t/pdf@0.3.1
[0.3.0]: https://github.com/F-O-T/libraries/compare/@f-o-t/pdf@0.2.0...@f-o-t/pdf@0.3.0
[0.2.0]: https://github.com/F-O-T/libraries/compare/@f-o-t/pdf@0.1.5...@f-o-t/pdf@0.2.0
[0.1.5]: https://github.com/F-O-T/libraries/compare/@f-o-t/pdf@0.1.4...@f-o-t/pdf@0.1.5
[0.1.4]: https://github.com/F-O-T/libraries/compare/@f-o-t/pdf@0.1.3...@f-o-t/pdf@0.1.4
[0.1.3]: https://github.com/F-O-T/libraries/compare/@f-o-t/pdf@0.1.2...@f-o-t/pdf@0.1.3
[0.1.2]: https://github.com/F-O-T/libraries/compare/@f-o-t/pdf@0.1.1...@f-o-t/pdf@0.1.2
[0.1.1]: https://github.com/F-O-T/libraries/compare/@f-o-t/pdf@0.1.0...@f-o-t/pdf@0.1.1
