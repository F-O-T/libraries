# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] - 2026-02-20

### Fixed
- Replace `node:zlib` `deflateSync` with `fflate` `zlibSync` for browser compatibility — same RFC 1950 zlib output, works in both browser and Node

## [1.0.1] - 2026-02-18

### Added
- Performance benchmarks for QR code generation with short, medium, and long data strings (`__tests__/performance.test.ts`)

## [1.0.0] - 2026-02-13

### Added
- QR code generation from string data
- PNG buffer output
- Configurable size, error correction level, and margin
- Byte mode encoding (ISO/IEC 18004)

[1.0.2]: https://github.com/F-O-T/libraries/compare/@f-o-t/qrcode@1.0.1...@f-o-t/qrcode@1.0.2
[1.0.1]: https://github.com/F-O-T/libraries/compare/@f-o-t/qrcode@1.0.0...@f-o-t/qrcode@1.0.1
[1.0.0]: https://github.com/F-O-T/libraries/releases/tag/@f-o-t/qrcode@1.0.0
