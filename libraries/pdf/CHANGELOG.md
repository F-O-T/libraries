# Changelog

## [0.3.9] - 2026-02-19

### Fixed
- Plugin subdirectories (`generation`, `parsing`, `editing`) now correctly ship TypeScript declaration files (`index.d.ts` + map) in the published tarball; previously the `editing` plugin was missing its `.d.ts`, causing `TS7016` errors in downstream consumers
- `package.json` exports now include `"module"` and `"import"` conditions for all entry points (root + plugins) so Vite/rolldown resolving under `["module","browser","import"]` conditions no longer throws "not exported" errors

## [0.3.8] - 2026-02-18

### Fixed
- `findPageObjects` now recursively descends intermediate `/Type /Pages` nodes (non-leaf page tree nodes), correctly enumerating all leaf `/Type /Page` objects in nested page trees; previously it stopped at the first level, misreporting page count and causing `getMediaBox` failures for any PDF with a two-level (or deeper) page tree
- `getMediaBox` now walks up the `/Parent` chain until it finds a `/MediaBox` entry, implementing the PDF spec's inherited attribute resolution; previously it only checked the leaf page object itself, throwing for any page that relied on a parent node for its MediaBox
- Widget annotation (`/Annots`) is now attached to the page specified by the new `appearancePage` option instead of always being placed on page 0; PDF readers now navigate to the correct page when a signature field is clicked
- Added `appearancePage?: number` to `SignaturePlaceholderOptions` — zero-based index of the page that should host the signature widget annotation (defaults to 0)
- New OOM regression test suite (`__tests__/plugins/editing/memory-oom.test.ts`) covering reference-identity of `embedSignature`, nested page tree correctness, large-page-count survivability, heap-scaling bounds, and widget annotation page placement

## [0.3.7] - 2026-02-18

### Fixed
- Parser functions (`parsePdfStructure`, `extractObjectDictContent`, `getMediaBox`, `parseResourcesDict`, etc.) now accept a pre-decoded `pdfStr: string` parameter instead of calling `toLatin1(Uint8Array)` internally on every invocation; `PdfDocumentImpl` decodes the PDF bytes to a latin1 string exactly once in its constructor and reuses it everywhere, eliminating O(pages) redundant full-PDF string allocations that were the primary cause of JS heap OOM for multi-page documents
- `extractBytesToSign` now uses `Uint8Array.subarray()` (zero-copy views) instead of `.slice()` for the two input regions before combining them, removing two intermediate full-PDF-size allocations
- `embedSignature` patches the signature placeholder in-place rather than allocating a full PDF-sized copy, eliminating one more N-byte buffer per signing call

## [0.3.6] - 2026-02-18

### Fixed
- `saveWithPlaceholder` no longer allocates a full copy of the assembled output PDF to patch the ByteRange values — the update is now applied in-place, reducing peak heap by one PDF-sized buffer per signing operation
- `findByteRange`, `embedSignature`, and the internal byte-range update no longer decode the entire PDF to a JS string to locate structure markers; byte patterns are now found via direct `Uint8Array` search, eliminating up to 3× PDF-size string allocations during a single sign call

## [0.3.5] - 2026-02-18

### Added
- Performance benchmarks for PDF load, signature placeholder insertion, and multi-page scale tests (`__tests__/performance.test.ts`)

## [0.3.4] - 2026-02-15

### Fixed
- Fixed signature appearance rendering mirrored/upside-down on PDFs with non-identity CTM (e.g. from @react-pdf/renderer)
- New content streams now wrap original page content in `q`/`Q` (save/restore graphics state) so drawing operators run with the default PDF coordinate system

## [0.3.3] - 2026-02-15

### Fixed
- Use standard PDF coordinates (bottom-up) consistently across all editing plugin draw methods (`drawText`, `drawImage`, `drawRectangle`)
- Reverted `drawText` from mirrored `Tm` matrix back to `Td` operator to match `drawImage`/`drawRectangle` coordinate system
- Fixed QR code and certificate text rendering at different positions in signature appearances

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

[0.3.9]: https://github.com/F-O-T/libraries/compare/@f-o-t/pdf@0.3.8...@f-o-t/pdf@0.3.9
[0.3.5]: https://github.com/F-O-T/libraries/compare/@f-o-t/pdf@0.3.4...@f-o-t/pdf@0.3.5
[0.3.4]: https://github.com/F-O-T/libraries/compare/@f-o-t/pdf@0.3.3...@f-o-t/pdf@0.3.4
[0.3.3]: https://github.com/F-O-T/libraries/compare/@f-o-t/pdf@0.3.2...@f-o-t/pdf@0.3.3
[0.3.2]: https://github.com/F-O-T/libraries/compare/@f-o-t/pdf@0.3.1...@f-o-t/pdf@0.3.2
[0.3.1]: https://github.com/F-O-T/libraries/compare/@f-o-t/pdf@0.3.0...@f-o-t/pdf@0.3.1
[0.3.0]: https://github.com/F-O-T/libraries/compare/@f-o-t/pdf@0.2.0...@f-o-t/pdf@0.3.0
[0.2.0]: https://github.com/F-O-T/libraries/compare/@f-o-t/pdf@0.1.5...@f-o-t/pdf@0.2.0
[0.1.5]: https://github.com/F-O-T/libraries/compare/@f-o-t/pdf@0.1.4...@f-o-t/pdf@0.1.5
[0.1.4]: https://github.com/F-O-T/libraries/compare/@f-o-t/pdf@0.1.3...@f-o-t/pdf@0.1.4
[0.1.3]: https://github.com/F-O-T/libraries/compare/@f-o-t/pdf@0.1.2...@f-o-t/pdf@0.1.3
[0.1.2]: https://github.com/F-O-T/libraries/compare/@f-o-t/pdf@0.1.1...@f-o-t/pdf@0.1.2
[0.1.1]: https://github.com/F-O-T/libraries/compare/@f-o-t/pdf@0.1.0...@f-o-t/pdf@0.1.1
