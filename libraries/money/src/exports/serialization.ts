// =============================================================================
// Serialization
// =============================================================================

// JSON serialization
export { toJSON, fromJSON, toDatabase, fromDatabase, serialize, deserialize } from "../serialization/json";

// Conversion utilities
export { toMajorUnits, toMajorUnitsString, toMinorUnits, toMinorUnitsBigInt, toMinorUnitsString } from "../serialization/conversion";

// Serialization types
export type { MoneyJSON, DatabaseMoney } from "../types";
