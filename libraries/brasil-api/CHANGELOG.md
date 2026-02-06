# Changelog

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

- CEP (postal code) lookup API integration
- Bank information and listing
- CNPJ (company registry) lookups
- DDD (area codes) queries
- National holidays (Feriados) data
- IBGE geographic statistics: states and municipalities
- ISBN (book number) lookup
- NCM (trade nomenclature) codes and lookup
- PIX (instant payment system) participants
- Domain status checking (registro.br)
- Interest rates (Taxas) queries
- Corretoras (CVM-registered brokers) data
- CPTEC weather forecasts and city lookups
- Currency exchange rates (Cambio)
- FIPE vehicle pricing
- Configuration system for API integration
- Custom error classes for validation, network, and response errors
- Type-safe API wrapper with Zod validation
