# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.5] - 2026-02-06

### Fixed

- Fix CI release: build all libraries upfront so cross-library type declarations are available

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

## [1.0.0] - 2026-02-01

### Added

- **Operations**
  - `convert()` - Convert measurements between units in the same category
  - `add()` - Add two measurements with same unit
  - `subtract()` - Subtract measurements with same unit
  - `multiply()` - Multiply measurement by scalar value
  - `divide()` - Divide measurement by scalar value
  - `equals()`, `greaterThan()`, `greaterThanOrEqual()`, `lessThan()`, `lessThanOrEqual()` - Comparison operations
  - `format()` - Format measurements as human-readable strings with options

- **Condition-Evaluator Integration**
  - 6 comparison operators for business rules: `measurement_eq`, `measurement_neq`, `measurement_gt`, `measurement_gte`, `measurement_lt`, `measurement_lte`
  - Plugin export available at `@f-o-t/uom/operators`
  - Optional peer dependency on `@f-o-t/condition-evaluator`

- **Documentation**
  - Comprehensive README with complete API reference
  - Usage examples for all operations
  - Built-in units reference table
  - Custom unit registration guide
  - Condition-evaluator integration examples
  - Best practices and comparison with alternatives

### Changed

- **Public API Stabilization**: All exports are now considered stable and will follow semantic versioning
- **Breaking Change**: None - this release is fully backward compatible with 0.2.0

### Design Decisions

- All arithmetic operations require same unit (use `convert()` first if needed)
- All comparisons require same unit and scale
- Format function trims trailing zeros by default
- Operations return new Measurement instances (immutable)
- Operators plugin is optional (peer dependency)

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

[1.0.0]: https://github.com/F-O-T/libraries/releases/tag/@f-o-t/uom@1.0.0
[0.2.0]: https://github.com/F-O-T/libraries/releases/tag/@f-o-t/uom@0.2.0
[0.1.0]: https://github.com/F-O-T/libraries/releases/tag/@f-o-t/uom@0.1.0
