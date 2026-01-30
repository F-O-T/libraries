import { UnknownUnitError } from "../errors";
import type { UnitCategory, UnitDefinition } from "../types";
import { AREA_UNITS } from "./area";
import { LENGTH_UNITS } from "./length";
import { TEMPERATURE_UNITS } from "./temperature";
import { VOLUME_UNITS } from "./volume";
import { WEIGHT_UNITS } from "./weight";

/**
 * Combines all standard unit definitions into a single object
 */
const STANDARD_UNITS: Record<string, UnitDefinition> = {
   ...WEIGHT_UNITS,
   ...VOLUME_UNITS,
   ...LENGTH_UNITS,
   ...AREA_UNITS,
   ...TEMPERATURE_UNITS,
};

/**
 * Map for storing custom units registered at runtime
 */
const customUnits = new Map<string, UnitDefinition>();

/**
 * Gets a unit definition by its code
 * Custom units take precedence over standard units
 *
 * @param code - The unit code to look up
 * @returns The unit definition
 * @throws {UnknownUnitError} If the unit code is not found
 *
 * @example
 * ```typescript
 * const kg = getUnit('kg');
 * console.log(kg.name); // "kilogram"
 * ```
 */
export function getUnit(code: string): UnitDefinition {
   // Check custom units first (allows overriding standard units)
   const customUnit = customUnits.get(code);
   if (customUnit) {
      return customUnit;
   }

   // Check standard units
   if (code in STANDARD_UNITS) {
      return STANDARD_UNITS[code]!;
   }

   throw new UnknownUnitError(code);
}

/**
 * Checks if a unit code exists in the registry
 *
 * @param code - The unit code to check
 * @returns True if the unit exists, false otherwise
 *
 * @example
 * ```typescript
 * if (hasUnit('kg')) {
 *    console.log('Kilogram is available');
 * }
 * ```
 */
export function hasUnit(code: string): boolean {
   return customUnits.has(code) || code in STANDARD_UNITS;
}

/**
 * Registers a custom unit at runtime
 * If the unit has aliases, they are registered as separate entries
 *
 * @param unit - The unit definition to register
 *
 * @example
 * ```typescript
 * registerUnit({
 *    code: 'stone',
 *    name: 'stone',
 *    category: 'weight',
 *    baseUnit: 'kg',
 *    toBase: (val) => val * 6.35029,
 *    fromBase: (val) => val / 6.35029,
 *    aliases: ['st']
 * });
 * ```
 */
export function registerUnit(unit: UnitDefinition): void {
   // Register the main unit
   customUnits.set(unit.code, unit);

   // Register aliases as separate entries
   if (unit.aliases && unit.aliases.length > 0) {
      for (const alias of unit.aliases) {
         // Create a copy with the alias as the code
         const aliasUnit: UnitDefinition = {
            ...unit,
            code: alias,
         };
         customUnits.set(alias, aliasUnit);
      }
   }
}

/**
 * Gets all units (standard + custom)
 *
 * @returns Array of all unit definitions
 *
 * @example
 * ```typescript
 * const allUnits = getAllUnits();
 * console.log(allUnits.length); // Total number of available units
 * ```
 */
export function getAllUnits(): UnitDefinition[] {
   // Combine standard and custom units
   const allUnits = new Map<string, UnitDefinition>();

   // Add standard units first
   for (const [code, unit] of Object.entries(STANDARD_UNITS)) {
      allUnits.set(code, unit);
   }

   // Add custom units (will override standard units if same code)
   for (const [code, unit] of customUnits.entries()) {
      allUnits.set(code, unit);
   }

   return Array.from(allUnits.values());
}

/**
 * Clears all custom units from the registry
 * Standard units are not affected
 *
 * @example
 * ```typescript
 * clearCustomUnits();
 * console.log(hasUnit('kg')); // true (standard unit)
 * console.log(hasUnit('stone')); // false (custom unit removed)
 * ```
 */
export function clearCustomUnits(): void {
   customUnits.clear();
}

/**
 * Gets all units in a specific category
 *
 * @param category - The category to filter by
 * @returns Array of units in the specified category
 *
 * @example
 * ```typescript
 * const weightUnits = getUnitsByCategory('weight');
 * console.log(weightUnits.map(u => u.code)); // ['g', 'kg', 'mg', ...]
 * ```
 */
export function getUnitsByCategory(category: UnitCategory): UnitDefinition[] {
   return getAllUnits().filter((unit) => unit.category === category);
}
