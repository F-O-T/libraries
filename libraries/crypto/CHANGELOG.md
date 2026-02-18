# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-02-18

### Added
- Performance benchmarks for PKCS#12 parse, SHA-256/512 hashing, and RSA signing (`__tests__/performance.test.ts`)

## [1.0.0] - 2026-02-13

### Added
- PKCS#12 (.pfx/.p12) parsing: `parsePkcs12`
- CMS/PKCS#7 SignedData construction: `createSignedData`
- Hashing utility: `hash` (SHA-256, SHA-384, SHA-512)
- PEM utilities: `pemToDer`, `derToPem`

[1.0.1]: https://github.com/F-O-T/libraries/compare/@f-o-t/crypto@1.0.0...@f-o-t/crypto@1.0.1
[1.0.0]: https://github.com/F-O-T/libraries/releases/tag/@f-o-t/crypto@1.0.0
