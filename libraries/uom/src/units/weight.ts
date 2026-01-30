import { UnknownUnitError } from "../errors";
import type { UnitDefinition } from "../types";

/**
 * Weight unit definitions
 * Base unit: kilogram (kg)
 */
export const WEIGHT_UNITS = {
   // Metric units
   kg: {
      code: "kg",
      name: "Kilogram",
      category: "weight",
      baseUnit: "kg",
      conversionFactor: "1",
      symbol: "kg",
   },
   g: {
      code: "g",
      name: "Gram",
      category: "weight",
      baseUnit: "kg",
      conversionFactor: "0.001",
      symbol: "g",
   },
   mg: {
      code: "mg",
      name: "Milligram",
      category: "weight",
      baseUnit: "kg",
      conversionFactor: "0.000001",
      symbol: "mg",
   },
   ton: {
      code: "ton",
      name: "Metric Ton",
      category: "weight",
      baseUnit: "kg",
      conversionFactor: "1000",
      symbol: "t",
      aliases: ["tonne", "t"],
   },

   // Imperial units
   lbs: {
      code: "lbs",
      name: "Pound",
      category: "weight",
      baseUnit: "kg",
      conversionFactor: "0.45359237",
      symbol: "lb",
      aliases: ["lb", "pound", "pounds"],
   },
   oz: {
      code: "oz",
      name: "Ounce",
      category: "weight",
      baseUnit: "kg",
      conversionFactor: "0.028349523125",
      symbol: "oz",
      aliases: ["ounce", "ounces"],
   },
   stone: {
      code: "stone",
      name: "Stone",
      category: "weight",
      baseUnit: "kg",
      conversionFactor: "6.35029318",
      symbol: "st",
      aliases: ["st"],
   },
} as const satisfies Record<string, UnitDefinition>;

/**
 * Get a weight unit definition by code or alias
 * @param code - Unit code or alias
 * @returns Unit definition
 * @throws UnknownUnitError if unit is not found
 */
export function getWeightUnit(code: string): UnitDefinition {
   // Check direct code match
   if (code in WEIGHT_UNITS) {
      return WEIGHT_UNITS[code as keyof typeof WEIGHT_UNITS];
   }

   // Check aliases
   for (const unit of Object.values(WEIGHT_UNITS)) {
      const unitDef = unit as UnitDefinition;
      if (unitDef.aliases?.includes(code)) {
         return unitDef;
      }
   }

   throw new UnknownUnitError(code);
}

/**
 * Check if a code is a valid weight unit (including aliases)
 * @param code - Unit code or alias
 * @returns True if valid weight unit
 */
export function isWeightUnit(code: string): boolean {
   try {
      getWeightUnit(code);
      return true;
   } catch {
      return false;
   }
}
