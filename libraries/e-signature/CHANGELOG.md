# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `tsaTimeout?: number` option on `PdfSignOptions` — configurable timeout per TSA attempt (default: 10000ms)
- `tsaRetries?: number` option on `PdfSignOptions` — number of retry attempts on primary TSA server before falling back (default: 1)
- `tsaFallbackUrls?: string[]` option on `PdfSignOptions` — fallback TSA servers tried in order after primary fails; exponential backoff (1s, 2s) between primary retries only
- `signPdf` now accepts `ReadableStream<Uint8Array>` as PDF input in addition to `Uint8Array`; internally accumulates chunks before signing
- `signPdfBatch(files, options): AsyncGenerator<BatchSignEvent>` — sign multiple PDFs sequentially, yielding progress events per file; yields control between files to avoid blocking the event loop
- `signPdfBatchToArray(files, options): Promise<...>` — convenience wrapper for batch signing that collects results into an array
- `BatchSignInput` and `BatchSignEvent` types exported from the package

### Fixed
- TSA errors now include the server URL and original message in the error text instead of an opaque `fetch failed`

## [1.1.0] - 2026-02-18

### Added
- `appearances?: SignatureAppearance[]` field on `PdfSignOptions` — renders a visual stamp on each specified page in a single `signPdf` call, enabling multi-page document stamping while the cryptographic signature is still applied once over the entire document

## [1.0.7] - 2026-02-15

### Fixed
- Signature appearance Y coordinate now uses top-left origin (distance from top of page) matching user expectations, instead of raw PDF bottom-left origin which caused signatures placed at the bottom to appear at the top

## [1.0.6] - 2026-02-15

### Changed
- Updated `@f-o-t/pdf` dependency from `^0.3.3` to `^0.3.4`

### Fixed
- Visual signature appearance no longer renders mirrored/upside-down on PDFs with transformed coordinate systems (fixed via @f-o-t/pdf@0.3.4 graphics state isolation)

## [1.0.5] - 2026-02-15

### Changed
- Updated `@f-o-t/pdf` dependency from `^0.3.2` to `^0.3.3`

### Fixed
- QR code and certificate info text now render side-by-side within the same bounding box instead of at different page positions (fixed via @f-o-t/pdf@0.3.3 coordinate system fix)

## [1.0.4] - 2026-02-14

### Changed
- Updated `@f-o-t/digital-certificate` dependency from `^1.0.5` to `^2.2.0`
- Updated `@f-o-t/pdf` dependency from `^0.3.1` to `^0.3.2`

## [1.0.3] - 2026-02-14

### Changed
- Updated `@f-o-t/pdf` dependency from `^0.3.0` to `^0.3.1`

### Fixed
- Visual signature text now renders upright instead of upside-down/mirrored (fixed via @f-o-t/pdf@0.3.1 dependency upgrade)

## [1.0.2] - 2026-02-14

### Changed
- Updated `@f-o-t/pdf` dependency from `^0.2.0` to `^0.3.0`

### Fixed
- Visual signature appearances no longer corrupt document fonts (fixed via @f-o-t/pdf@0.3.0 dependency upgrade)
- PDFs from @react-pdf/renderer with CIDFont fonts now render correctly after signing with visual appearance

## [1.0.1] - 2026-02-14

### Fixed
- Internal dependency updates

## [1.0.0] - 2026-02-13

### Added
- Initial release of PAdES PDF signing library
- `signPdf` function for signing PDFs with digital certificates
- ICP-Brasil compliance with `signing-certificate-v2` and `signature-policy` attributes
- Visual signature appearance with QR code and certificate info
- RFC 3161 timestamp client using native `fetch`
- Zod schema validation for all inputs
- Support for DocMDP permissions (1, 2, 3)

[1.1.0]: https://github.com/F-O-T/libraries/compare/@f-o-t/e-signature@1.0.7...@f-o-t/e-signature@1.1.0
[1.0.7]: https://github.com/F-O-T/libraries/compare/@f-o-t/e-signature@1.0.6...@f-o-t/e-signature@1.0.7
[1.0.6]: https://github.com/F-O-T/libraries/compare/@f-o-t/e-signature@1.0.5...@f-o-t/e-signature@1.0.6
[1.0.5]: https://github.com/F-O-T/libraries/compare/@f-o-t/e-signature@1.0.4...@f-o-t/e-signature@1.0.5
[1.0.4]: https://github.com/F-O-T/libraries/compare/@f-o-t/e-signature@1.0.3...@f-o-t/e-signature@1.0.4
[1.0.3]: https://github.com/F-O-T/libraries/compare/@f-o-t/e-signature@1.0.2...@f-o-t/e-signature@1.0.3
[1.0.2]: https://github.com/F-O-T/libraries/compare/@f-o-t/e-signature@1.0.1...@f-o-t/e-signature@1.0.2
[1.0.1]: https://github.com/F-O-T/libraries/compare/@f-o-t/e-signature@1.0.0...@f-o-t/e-signature@1.0.1
[1.0.0]: https://github.com/F-O-T/libraries/releases/tag/@f-o-t/e-signature@1.0.0
