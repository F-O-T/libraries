# Changelog

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
