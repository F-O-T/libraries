import { UnknownUnitError } from "../errors";
import type { UnitDefinition } from "../types";

/**
 * Area unit definitions
 * Base unit: square meter (m2)
 */
export const AREA_UNITS = {
   // Metric units
   m2: {
      code: "m2",
      name: "Square Meter",
      category: "area",
      baseUnit: "m2",
      conversionFactor: "1",
      symbol: "m²",
      aliases: ["m²", "square meter", "square metre"],
   },
   km2: {
      code: "km2",
      name: "Square Kilometer",
      category: "area",
      baseUnit: "m2",
      conversionFactor: "1000000",
      symbol: "km²",
      aliases: ["km²", "square kilometer", "square kilometre"],
   },
   cm2: {
      code: "cm2",
      name: "Square Centimeter",
      category: "area",
      baseUnit: "m2",
      conversionFactor: "0.0001",
      symbol: "cm²",
      aliases: ["cm²", "square centimeter", "square centimetre"],
   },
   ha: {
      code: "ha",
      name: "Hectare",
      category: "area",
      baseUnit: "m2",
      conversionFactor: "10000",
      symbol: "ha",
      aliases: ["hectare", "hectares"],
   },

   // Imperial units
   ft2: {
      code: "ft2",
      name: "Square Foot",
      category: "area",
      baseUnit: "m2",
      conversionFactor: "0.09290304",
      symbol: "ft²",
      aliases: ["ft²", "square foot", "square feet"],
   },
   in2: {
      code: "in2",
      name: "Square Inch",
      category: "area",
      baseUnit: "m2",
      conversionFactor: "0.00064516",
      symbol: "in²",
      aliases: ["in²", "square inch", "square inches"],
   },
   acre: {
      code: "acre",
      name: "Acre",
      category: "area",
      baseUnit: "m2",
      conversionFactor: "4046.8564224",
      symbol: "ac",
      aliases: ["acres", "ac"],
   },
} as const satisfies Record<string, UnitDefinition>;

/**
 * Get an area unit definition by code or alias
 * @param code - Unit code or alias
 * @returns Unit definition
 * @throws UnknownUnitError if unit is not found
 */
export function getAreaUnit(code: string): UnitDefinition {
   // Check direct code match
   if (code in AREA_UNITS) {
      return AREA_UNITS[code as keyof typeof AREA_UNITS];
   }

   // Check aliases
   for (const unit of Object.values(AREA_UNITS)) {
      const unitDef = unit as UnitDefinition;
      if (unitDef.aliases?.includes(code)) {
         return unitDef;
      }
   }

   throw new UnknownUnitError(code);
}

/**
 * Check if a code is a valid area unit (including aliases)
 * @param code - Unit code or alias
 * @returns True if valid area unit
 */
export function isAreaUnit(code: string): boolean {
   try {
      getAreaUnit(code);
      return true;
   } catch {
      return false;
   }
}
