# Changelog

## 0.1.0

### Features

- `of()` and `zero()` factory functions for creating measurements
- `DEFAULT_SCALE` constant for precision control
- Unit registry system: `registerUnit()`, `getUnit()`, `getUnitsByCategory()`, `getAllUnits()`, `hasUnit()`, `clearCustomUnits()`
- Measurement class for unit conversions and arithmetic operations
- Unit category system for organizing units
- Comprehensive error handling: ConversionError, UnitMismatchError, CategoryMismatchError, UnknownUnitError, InvalidMeasurementError
- Schema validation for measurements and unit definitions
- Type-safe units of measurement with BigInt precision
