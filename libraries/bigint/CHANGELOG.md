# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] - 2026-02-06

### Fixed

- Fix CI build: build toolchain (config + cli) before other libraries to ensure `fot` binary is available

## [1.0.1] - 2026-02-06

### Fixed

- Add .npmignore to ensure dist/ is included in npm tarball regardless of .gitignore settings

## [1.0.0] - 2026-02-01

### Added

- **Core Modules**
  - `parseToBigInt` - Parse decimal strings/numbers to bigint with configurable scale
  - `formatFromBigInt` - Format bigint to decimal strings with trailing zero control
  - `add`, `subtract`, `multiply`, `divide` - Arithmetic operations with same-scale requirement
  - `abs`, `min`, `max` - Additional arithmetic utilities
  - `compare`, `equals`, `greaterThan`, `greaterThanOrEqual`, `lessThan`, `lessThanOrEqual` - Comparison operations
  - `isZero`, `isPositive`, `isNegative` - Sign checking operations
  - `bankersRound`, `roundUp`, `roundDown` - Rounding utilities
  - `convertScale` - Scale conversion with rounding mode support

- **Rounding Modes**
  - `truncate` - Simple truncation (default)
  - `round` - Banker's rounding (round half to even)
  - `ceil` - Round toward positive infinity
  - `floor` - Round toward negative infinity

- **Validation**
  - 10 Zod schemas for comprehensive input validation
  - `ParseInputSchema`, `FormatInputSchema`, `ArithmeticInputSchema`, `DivideInputSchema`
  - `ScaledBigIntSchema`, `RoundingModeSchema`, `ScaleSchema`, `DecimalStringSchema`
  - `ConvertScaleInputSchema`

- **Condition-Evaluator Integration**
  - 6 comparison operators: `bigint_eq`, `bigint_neq`, `bigint_gt`, `bigint_gte`, `bigint_lt`, `bigint_lte`
  - 4 range/state operators: `bigint_between`, `bigint_zero`, `bigint_positive`, `bigint_negative`
  - Plugin export available at `@f-o-t/bigint/operators`

- **Documentation**
  - Comprehensive README with usage examples for all modules
  - Condition-evaluator integration guide
  - Complete operator reference
  - Type exports documentation
  - Design philosophy explanation

### Design Decisions

- All validation handled via Zod schemas (no custom error classes)
- All functions use object parameter syntax for clarity and type safety
- Same-scale requirement enforced for all arithmetic operations
- Banker's rounding (round half to even) as the precision rounding mode
- Low-level primitives only - no domain-specific concepts

[1.0.0]: https://github.com/yourusername/fot-libraries/releases/tag/@f-o-t/bigint@1.0.0
