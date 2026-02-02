# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-02-01

### Changed

- **Internal refactor**: Migrated to `@f-o-t/bigint` ^1.0.0 for bigint operations
  - `parseDecimalToBigInt` now uses `parseToBigInt` from @f-o-t/bigint
  - `formatBigIntToDecimal` now uses `formatFromBigInt` from @f-o-t/bigint
- **Note**: This is an internal refactor with no breaking changes to public APIs
- **Benefit**: Standardized bigint operations across all FOT libraries
- **Behavior**: Maintains exact same parsing and formatting behavior

### Dependencies

- Added `@f-o-t/bigint` ^1.0.0

## [0.1.0] - 2026-01-31

### Added

- `of()` and `zero()` factory functions for creating measurements
- `DEFAULT_SCALE` constant for precision control
- Unit registry system: `registerUnit()`, `getUnit()`, `getUnitsByCategory()`, `getAllUnits()`, `hasUnit()`, `clearCustomUnits()`
- Measurement class for unit conversions and arithmetic operations
- Unit category system for organizing units
- Comprehensive error handling: ConversionError, UnitMismatchError, CategoryMismatchError, UnknownUnitError, InvalidMeasurementError
- Schema validation for measurements and unit definitions
- Type-safe units of measurement with BigInt precision

[0.2.0]: https://github.com/F-O-T/libraries/releases/tag/@f-o-t/uom@0.2.0
[0.1.0]: https://github.com/F-O-T/libraries/releases/tag/@f-o-t/uom@0.1.0
