# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.14] - 2026-02-19

### Changed

- Bump `@f-o-t/config` devDependency to `^1.0.5` to pick up the `module` condition fix in the package-json generator

## [1.2.13] - 2026-02-19

### Fixed

- Add `module` condition to `package.json` exports (both `.` and `./plugins/react`) so Vite/rolldown resolving under conditions `["module", "browser", "development", "import"]` can locate the ESM entry points — the `module` condition was absent, causing a "not exported under the conditions" build error when the app was started with a newer Vite version

## [1.2.12] - 2026-02-19

### Fixed

- Add `import` condition to `package.json` exports (both `.` and `./plugins/react`) so Vite and other bundlers resolving under conditions `["module", "browser", "import"]` can locate the ESM entry points — previously only `default` was present, causing a "not exported under the conditions" error when importing `@f-o-t/e-signature/plugins/react`

## [1.2.11] - 2026-02-19

### Fixed

- Added `"./plugins/react"` to the `exports` field in `package.json`; the entry was missing from the published manifest because `fot build` did not previously sync `exports` from `fot.config.ts` — Vite/Rolldown (and any bundler respecting the `exports` map) would reject the import with *"not exported under the conditions [module, browser, …]"*

## [1.2.10] - 2026-02-19

### Fixed
- Corrected TypeScript errors in `react.test.tsx`: cast `mockSignPdf.mock.calls[0]` to `[Uint8Array, unknown]` to match the two-argument mock signature; added explicit cast on `thrown` to `Error | null` to resolve incorrect `never` narrowing; typed `firstPromise` as `Promise<Uint8Array<ArrayBufferLike>>` and cast at the `mockImplementationOnce` call site to satisfy the `ArrayBuffer` vs `ArrayBufferLike` assignability constraint

## [1.2.9] - 2026-02-19

### Changed
- Updated `@f-o-t/digital-certificate` dependency to `^2.3.0` to pick up browser-compatible `parseCertificate` (`Uint8Array` parameter) and cross-platform base64 helpers

### Fixed
- `signPdf` no longer wraps `opts.certificate.p12` in `Buffer.from()` before passing it to `parseCertificate`; the `Uint8Array` is passed directly, removing the last Node-only `Buffer` usage in the signing path — `signPdf` now runs in browser environments without polyfills

## [1.2.8] - 2026-02-19

### Changed
- Updated `@f-o-t/crypto` dependency to `^1.2.0` and `@f-o-t/digital-certificate` to `^2.2.2` to pick up pure-TS PBKDF2/HMAC optimizations (~8× faster PBKDF2-SHA256, ~3× faster `parsePkcs12`); `signPdf` is now viable on the client side (browser/Edge Runtime) without OpenSSL

## [1.2.7] - 2026-02-18

### Fixed
- `signPdf` now passes `appearancePage` to `saveWithPlaceholder` so the PDF widget annotation is placed on the same page as the visual signature; previously the annotation always landed on page 0 regardless of where the appearance was drawn, causing PDF readers to navigate to the wrong page when clicking the signature field
- Signature placeholder size is now computed dynamically from the actual certificate chain byte length (`certChainBytes * 2 + 8 KB base + 4 KB for TSA`) instead of a fixed 16 KB, preventing "signature too large" failures for certificate chains with 5+ certificates or large RSA keys; the floor remains 16 KB for small chains
- `parsePkcs12` is now called only once (step 1) and the result reused throughout `signPdf`; the previous code parsed the same PKCS#12 twice (steps 1 and 6), doubling CPU and memory cost of certificate parsing for every `signPdf` call
- Updated `@f-o-t/pdf` dependency floor to `^0.3.8` to pick up nested page tree recursion, MediaBox inheritance fix, and correct widget annotation page placement

## [1.2.6] - 2026-02-18

### Fixed
- Updated `@f-o-t/pdf` dependency floor to `^0.3.7` to pick up the parser memory fix: PDF bytes are now decoded to a latin1 string exactly once per `signPdf` call (previously decoded O(pages) times), and `embedSignature` / `extractBytesToSign` no longer allocate unnecessary full-PDF-sized copies — together these eliminate the JS heap OOM that users hit when signing PDFs with more than a few pages

## [1.2.5] - 2026-02-18

### Fixed
- `extractSignatureValue` now locates `signerInfos` as the last child of `SignedData` (`.at(-1)`) instead of hardcoded index `[4]`; the previous index assumed `certificates [0]` was always present and `crls [1]` always absent, which would produce a wrong timestamp over external CMS blobs with a different layout
- Updated `@f-o-t/crypto` dependency floor to `^1.1.0` to pick up `appendUnauthAttributes` and the corresponding signerInfos fix

## [1.2.4] - 2026-02-18

### Fixed
- `signPdf` with `appearances` array no longer generates and embeds a separate QR image XObject per entry; the QR image is pre-computed once and shared across all appearances, collapsing N `generateQrCode` + `doc.embedPng` calls into 1 and preventing O(N) heap growth that caused JavaScript heap OOM in Vercel Edge Runtime for PDFs with 5+ appearances
- Updated `@f-o-t/pdf` dependency floor to `^0.3.6` to pick up in-place ByteRange patching and binary `findByteRange` (eliminates up to 3× PDF-size string allocations per sign call)

## [1.2.3] - 2026-02-18

### Fixed
- `signPdf` with `timestamp: true` now correctly embeds the RFC 3161 timestamp token as an unauthenticated attribute (OID `1.2.840.113549.1.9.16.2.14`) inside the CMS SignerInfo; previously the token was requested from the TSA but silently discarded, leaving signatures indistinguishable from untimestamped ones

## [1.2.2] - 2026-02-18

### Fixed
- `onTimestampError` schema now uses Zod v4 `z.function({ input, output })` API instead of the removed `z.function().args().returns()` (Zod v3) — fixes `TypeError: z.function(...).args is not a function` at import time

## [1.2.1] - 2026-02-18

### Added
- `tsaTimeout?: number` option on `PdfSignOptions` — configurable timeout per TSA attempt (default: 10000ms)
- `tsaRetries?: number` option on `PdfSignOptions` — number of retry attempts after the initial request fails; total attempts = `1 + tsaRetries` (default: `0`)
- `tsaFallbackUrls?: string[]` option on `PdfSignOptions` — fallback TSA servers tried in order after primary fails; exponential backoff (1s, 2s) between primary retries only
- `onTimestampError?: (error: unknown) => void` option on `PdfSignOptions` — optional callback invoked when timestamping fails (non-fatal); use for logging or metrics
- `signPdf` now accepts `ReadableStream<Uint8Array>` as PDF input in addition to `Uint8Array`; internally accumulates chunks before signing
- `signPdfBatch(files, options): AsyncGenerator<BatchSignEvent>` — sign multiple PDFs sequentially, yielding progress events per file; yields control between files to avoid blocking the event loop
- `signPdfBatchToArray(files, options): Promise<...>` — convenience wrapper for batch signing that collects results into an array
- `BatchSignInput` and `BatchSignEvent` types exported from the package

### Fixed
- TSA errors now include the server URL and original message in the error text instead of an opaque `fetch failed`
- `tsaRetries` semantics corrected: now means retries *after* the initial attempt (`1 + tsaRetries` total); default changed from `1` to `0` so the default behavior (1 attempt) is unchanged
- `batch_complete.totalFiles` now reflects the number of files actually processed (non-falsy entries) instead of the raw array length, ensuring it always equals the number of `file_start` events emitted

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

[1.2.11]: https://github.com/F-O-T/libraries/compare/@f-o-t/e-signature@1.2.10...@f-o-t/e-signature@1.2.11
[1.2.10]: https://github.com/F-O-T/libraries/compare/@f-o-t/e-signature@1.2.9...@f-o-t/e-signature@1.2.10
[1.2.9]: https://github.com/F-O-T/libraries/compare/@f-o-t/e-signature@1.2.8...@f-o-t/e-signature@1.2.9
[1.2.8]: https://github.com/F-O-T/libraries/compare/@f-o-t/e-signature@1.2.7...@f-o-t/e-signature@1.2.8
[1.2.7]: https://github.com/F-O-T/libraries/compare/@f-o-t/e-signature@1.2.6...@f-o-t/e-signature@1.2.7
[1.2.6]: https://github.com/F-O-T/libraries/compare/@f-o-t/e-signature@1.2.5...@f-o-t/e-signature@1.2.6
[1.2.5]: https://github.com/F-O-T/libraries/compare/@f-o-t/e-signature@1.2.4...@f-o-t/e-signature@1.2.5
[1.2.0]: https://github.com/F-O-T/libraries/compare/@f-o-t/e-signature@1.1.0...@f-o-t/e-signature@1.2.0
[1.1.0]: https://github.com/F-O-T/libraries/compare/@f-o-t/e-signature@1.0.7...@f-o-t/e-signature@1.1.0
[1.0.7]: https://github.com/F-O-T/libraries/compare/@f-o-t/e-signature@1.0.6...@f-o-t/e-signature@1.0.7
[1.0.6]: https://github.com/F-O-T/libraries/compare/@f-o-t/e-signature@1.0.5...@f-o-t/e-signature@1.0.6
[1.0.5]: https://github.com/F-O-T/libraries/compare/@f-o-t/e-signature@1.0.4...@f-o-t/e-signature@1.0.5
[1.0.4]: https://github.com/F-O-T/libraries/compare/@f-o-t/e-signature@1.0.3...@f-o-t/e-signature@1.0.4
[1.0.3]: https://github.com/F-O-T/libraries/compare/@f-o-t/e-signature@1.0.2...@f-o-t/e-signature@1.0.3
[1.0.2]: https://github.com/F-O-T/libraries/compare/@f-o-t/e-signature@1.0.1...@f-o-t/e-signature@1.0.2
[1.0.1]: https://github.com/F-O-T/libraries/compare/@f-o-t/e-signature@1.0.0...@f-o-t/e-signature@1.0.1
[1.0.0]: https://github.com/F-O-T/libraries/releases/tag/@f-o-t/e-signature@1.0.0
