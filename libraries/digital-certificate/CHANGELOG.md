# Changelog

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
