# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[1.0.2]: https://github.com/F-O-T/libraries/compare/@f-o-t/e-signature@1.0.1...@f-o-t/e-signature@1.0.2
[1.0.1]: https://github.com/F-O-T/libraries/compare/@f-o-t/e-signature@1.0.0...@f-o-t/e-signature@1.0.1
[1.0.0]: https://github.com/F-O-T/libraries/releases/tag/@f-o-t/e-signature@1.0.0
