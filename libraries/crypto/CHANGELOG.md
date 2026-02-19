# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [1.3.0] - 2026-02-19

### Changed
- `parsePkcs12` is now `async` and returns `Promise<Pkcs12Result>` — callers must `await` the result
- PBES2 key derivation (PBKDF2) now uses `SubtleCrypto.deriveBits` when available (browser / Node 18+ / Bun), offloading the CPU-intensive key stretching to the platform's native implementation; pure-JS PBKDF2 is retained as a fallback for environments without Web Crypto
- `createSignedData` (CMS) is `async` and uses `SubtleCrypto.sign` for RSA and ECDSA signing when available, with pure-JS fallback — the main thread is no longer blocked during signing

### Fixed
- Performance test `PKCS#12 parse` now uses `benchmarkAsync` to correctly await the async `parsePkcs12` call

## [1.2.0] - 2026-02-19

### Added
- `createHmac(alg, key): HmacContext` — precomputed HMAC context for a fixed key; for SHA-256 precomputes ipad/opad block states so each `compute()` call skips the fixed-prefix compression, yielding ~8× speedup in PBKDF2 inner loops
- `sha256ProcessBlock(block: Uint8Array): Uint32Array` — process a single 64-byte block into a SHA-256 half-state; enables HMAC key-schedule precomputation
- `sha256WithState(initState, data, prefixLen): Uint8Array` — compute SHA-256 continuing from a pre-processed state; used by `createHmac` to skip redundant block compressions
- `HmacContext` interface exported from primitives

### Changed
- `pbkdf2` now uses `createHmac` internally to precompute the key schedule once per derivation call, avoiding 2 SHA-256 block compressions per HMAC iteration (critical for high iteration counts)
- `pkcs12Kdf` (internal) pre-allocates a single `D||I` scratch buffer instead of calling `concat(D, I)` on every SHA-1 iteration, removing 2048+ allocations per KDF call

### Performance
- PBKDF2-SHA256 at 2048 iterations: ~104ms → ~13ms (8× faster)
- `parsePkcs12` on a PBES2-encrypted PFX: ~117ms → ~40ms (3× faster)

## [1.1.0] - 2026-02-18

### Added
- `appendUnauthAttributes(signedDataDer, attributes)` — appends unauthenticated attributes to an existing CMS SignedData DER without re-signing; safe for non-deterministic algorithms (PSS, ECDSA)

### Fixed
- `appendUnauthAttributes` and the internal `extractSignatureValue` helper now locate `signerInfos` as the last child of `SignedData` (`.at(-1)`) instead of a hardcoded index `[4]`; the previous approach silently corrupted external CMS blobs where optional `certificates [0]` or `crls [1]` fields were absent or present

## [1.0.1] - 2026-02-18

### Added
- Performance benchmarks for PKCS#12 parse, SHA-256/512 hashing, and RSA signing (`__tests__/performance.test.ts`)

## [1.0.0] - 2026-02-13

### Added
- PKCS#12 (.pfx/.p12) parsing: `parsePkcs12`
- CMS/PKCS#7 SignedData construction: `createSignedData`
- Hashing utility: `hash` (SHA-256, SHA-384, SHA-512)
- PEM utilities: `pemToDer`, `derToPem`

[1.3.0]: https://github.com/F-O-T/libraries/compare/@f-o-t/crypto@1.2.0...@f-o-t/crypto@1.3.0
[1.2.0]: https://github.com/F-O-T/libraries/compare/@f-o-t/crypto@1.1.0...@f-o-t/crypto@1.2.0
[1.1.0]: https://github.com/F-O-T/libraries/compare/@f-o-t/crypto@1.0.1...@f-o-t/crypto@1.1.0
[1.0.1]: https://github.com/F-O-T/libraries/compare/@f-o-t/crypto@1.0.0...@f-o-t/crypto@1.0.1
[1.0.0]: https://github.com/F-O-T/libraries/releases/tag/@f-o-t/crypto@1.0.0
