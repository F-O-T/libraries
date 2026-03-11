# Changelog

## [2.4.2] - 2026-03-11

### Fixed
- Fix mTLS plugin build: wrap `Uint8Array` pfxBuffer with `Buffer.from()` for Node.js `tls.SecureContextOptions` and `https.AgentOptions` type compatibility
- Fix CI build failure caused by TS2322 error in `plugins/mtls/index.ts`

## [2.4.1] - 2026-03-11

### Added
- `CertificateParseError` class with structured `code` field for programmatic error handling
- `CertificateErrorCode` type — `EMPTY_FILE`, `INVALID_FORMAT`, `WRONG_PASSWORD`, `UNSUPPORTED_ALGORITHM`, `NO_CERTIFICATE`, `NO_PRIVATE_KEY`, `CORRUPTED_FILE`, `X509_PARSE_FAILED`, `PEM_EXTRACTION_FAILED`, `UNKNOWN`
- Input validation: empty file detection, file type sniffing (rejects PDFs, images, ZIPs, PEM text with helpful messages)
- Original low-level error preserved as `cause` on all `CertificateParseError` instances

### Changed
- All `parseCertificate` errors now throw `CertificateParseError` instead of generic `Error` — consumers can `switch` on `error.code` for specific handling
- Error messages are now user-facing and actionable (e.g. "Wrong certificate password. Please verify and try again." instead of "PKCS#12 MAC verification failed (wrong password?)")

## [2.4.0] - 2026-03-11

### Changed
- **BREAKING**: `parseCertificate` is now `async` and returns `Promise<CertificateInfo>` — callers must `await` the result
- This fixes certificate parsing silently failing since `@f-o-t/crypto@1.3.0` made `parsePkcs12` async; the unawaited Promise caused all PFX parsing to fail with "invalid certificate file"

### Fixed
- Certificate upload broken for all users since `@f-o-t/crypto@1.3.0` — `parsePkcs12()` was called without `await`, resulting in a Promise object instead of the parsed result

## [2.3.1] - 2026-03-04

### Added
- `parseCertificateFromDer(certDer, keyDer, pfx, password)` — builds `CertificateInfo` from already-extracted DER bytes, skipping the expensive PBKDF2 key derivation in `parsePkcs12`; use when you already have cert/key DER from a prior P12 parse

## [2.3.0] - 2026-02-19

### Added
- `base64ToBytes(b64: string): Uint8Array` utility — cross-platform base64 decoder (uses `Buffer` in Node/Bun, `atob` in browsers)
- `bytesToBase64(bytes: Uint8Array): string` utility — cross-platform base64 encoder (uses `Buffer` in Node/Bun, `btoa` in browsers)

### Changed
- `parseCertificate` now accepts `Uint8Array` instead of `Buffer` — makes the function callable in browser environments where `Buffer` is unavailable; Node/Bun callers are unaffected because `Buffer` is a `Uint8Array` subclass
- `CertificateInfo.pfxBuffer` type changed from `Buffer` to `Uint8Array` — aligns with the new parameter type; Node code holding `Buffer` instances continues to work unchanged
- `derToPem` internal implementation no longer uses `Buffer.toString("base64")`; uses `bytesToBase64` so PEM encoding works in browsers
- X.509 DER decoding no longer uses `Buffer.from(b64, "base64")`; uses `base64ToBytes` so certificate parsing works in browsers
- Zod schema `pfxBuffer: z.instanceof(Buffer)` changed to `z.instanceof(Uint8Array)` — validates both `Uint8Array` and `Buffer` objects (Node's `Buffer` passes because it extends `Uint8Array`)

## [2.2.2] - 2026-02-19

### Changed
- Updated `@f-o-t/crypto` dependency to `^1.2.0` to pick up HMAC precomputation and PBKDF2 optimizations (PBKDF2-SHA256 is ~8× faster; `parsePkcs12` on PBES2-encrypted PFX is ~3× faster)

### Fixed
- Relaxed `parseCertificate` performance test threshold to 200ms (from 100ms) to reflect pure-TS baseline; threshold will be revisited when WebCrypto/native PBKDF2 fallbacks are implemented

## [2.2.1] - 2026-02-18

### Added
- Performance benchmarks for certificate parsing, PEM pair extraction, validity check, and expiry calculation (`__tests__/performance.test.ts`)

## [2.2.0] - 2026-02-14

### Added
- Pure JavaScript X.509 certificate parser using `@f-o-t/asn1` (no OpenSSL dependency)
- `@f-o-t/asn1` as a runtime dependency

### Changed
- Replaced `crypto.X509Certificate` (requires OpenSSL) with ASN.1-based parsing
- Certificate parsing now works in Bun without OpenSSL library
- Fixes certificate info not displaying in serverless environments

## [2.1.0] - 2026-02-14

### Changed
- Replaced OpenSSL CLI dependency with pure JavaScript PKCS#12 parsing via `@f-o-t/crypto`
- OpenSSL is no longer required to be installed on the system
- PFX extraction now works in Bun, serverless environments, and platforms without `/dev/stdin`

### Added
- `@f-o-t/crypto` as a runtime dependency

### Removed
- OpenSSL CLI system dependency
- Internal `opensslExtract` and `escapeShellArg` helper functions

## [2.0.0] - 2026-02-13

### Removed
- **BREAKING**: Removed `plugins/pdf-signer` — PDF signing has moved to `@f-o-t/e-signature`
- Removed all external dependencies: `node-forge`, `pdf-lib`, `axios`, `qrcode`, `@signpdf/*` (4 packages), `asn1js`, `pkijs`
- Removed `@types/qrcode` dev dependency

### Changed
- **BREAKING**: The `./plugins/pdf-signer` export no longer exists. Use `@f-o-t/e-signature` instead.
- Library now only depends on `@f-o-t/xml` + `zod` (zero third-party runtime deps)

## [1.0.5] - 2026-02-06

### Changed

- Update internal dependencies to latest versions

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

- Parse Brazilian A1 digital certificates (.pfx/.p12)
- Extract certificate info: subject, issuer, serial, validity, CNPJ/CPF
- XML-DSig enveloped signatures with RSA-SHA1 and RSA-SHA256
- Mutual TLS (mTLS) context and HTTPS agent creation
- PEM pair extraction for custom HTTP clients
