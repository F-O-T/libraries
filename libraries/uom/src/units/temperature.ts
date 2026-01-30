import { UnknownUnitError } from "../errors";
import type { UnitDefinition } from "../types";

/**
 * Temperature unit definitions
 * Base unit: Celsius (C)
 *
 * NOTE: Temperature conversions are NOT linear and require offset adjustments.
 * The conversion factors shown here represent the slope/ratio for temperature
 * differences, but absolute temperature conversions require additional offset
 * calculations:
 * - C to F: (C × 9/5) + 32
 * - C to K: C + 273.15
 * - F to C: (F - 32) × 5/9
 * - K to C: K - 273.15
 *
 * This requires special handling in conversion logic.
 */
export const TEMPERATURE_UNITS = {
   C: {
      code: "C",
      name: "Celsius",
      category: "temperature",
      baseUnit: "C",
      conversionFactor: "1",
      symbol: "°C",
      aliases: ["celsius", "°C"],
   },
   F: {
      code: "F",
      name: "Fahrenheit",
      category: "temperature",
      baseUnit: "C",
      conversionFactor: "0.5555555555555556", // 5/9 ratio
      symbol: "°F",
      aliases: ["fahrenheit", "°F"],
   },
   K: {
      code: "K",
      name: "Kelvin",
      category: "temperature",
      baseUnit: "C",
      conversionFactor: "1", // 1:1 ratio
      symbol: "K",
      aliases: ["kelvin"],
   },
} as const satisfies Record<string, UnitDefinition>;

/**
 * Get a temperature unit definition by code or alias
 * @param code - Unit code or alias
 * @returns Unit definition
 * @throws UnknownUnitError if unit is not found
 */
export function getTemperatureUnit(code: string): UnitDefinition {
   // Check direct code match
   if (code in TEMPERATURE_UNITS) {
      return TEMPERATURE_UNITS[code as keyof typeof TEMPERATURE_UNITS];
   }

   // Check aliases
   for (const unit of Object.values(TEMPERATURE_UNITS)) {
      const unitDef = unit as UnitDefinition;
      if (unitDef.aliases?.includes(code)) {
         return unitDef;
      }
   }

   throw new UnknownUnitError(code);
}

/**
 * Check if a code is a valid temperature unit (including aliases)
 * @param code - Unit code or alias
 * @returns True if valid temperature unit
 */
export function isTemperatureUnit(code: string): boolean {
   try {
      getTemperatureUnit(code);
      return true;
   } catch {
      return false;
   }
}
