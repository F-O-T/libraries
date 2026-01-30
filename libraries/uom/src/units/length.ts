import { UnknownUnitError } from "../errors";
import type { UnitDefinition } from "../types";

/**
 * Length unit definitions
 * Base unit: meter (m)
 */
export const LENGTH_UNITS = {
   // Metric units
   m: {
      code: "m",
      name: "Meter",
      category: "length",
      baseUnit: "m",
      conversionFactor: "1",
      symbol: "m",
      aliases: ["meter", "metre"],
   },
   km: {
      code: "km",
      name: "Kilometer",
      category: "length",
      baseUnit: "m",
      conversionFactor: "1000",
      symbol: "km",
      aliases: ["kilometer", "kilometre"],
   },
   cm: {
      code: "cm",
      name: "Centimeter",
      category: "length",
      baseUnit: "m",
      conversionFactor: "0.01",
      symbol: "cm",
      aliases: ["centimeter", "centimetre"],
   },
   mm: {
      code: "mm",
      name: "Millimeter",
      category: "length",
      baseUnit: "m",
      conversionFactor: "0.001",
      symbol: "mm",
      aliases: ["millimeter", "millimetre"],
   },

   // Imperial units
   ft: {
      code: "ft",
      name: "Foot",
      category: "length",
      baseUnit: "m",
      conversionFactor: "0.3048",
      symbol: "ft",
      aliases: ["foot", "feet"],
   },
   in: {
      code: "in",
      name: "Inch",
      category: "length",
      baseUnit: "m",
      conversionFactor: "0.0254",
      symbol: "in",
      aliases: ["inch", "inches"],
   },
   yd: {
      code: "yd",
      name: "Yard",
      category: "length",
      baseUnit: "m",
      conversionFactor: "0.9144",
      symbol: "yd",
      aliases: ["yard", "yards"],
   },
   mi: {
      code: "mi",
      name: "Mile",
      category: "length",
      baseUnit: "m",
      conversionFactor: "1609.344",
      symbol: "mi",
      aliases: ["mile", "miles"],
   },
} as const satisfies Record<string, UnitDefinition>;

/**
 * Get a length unit definition by code or alias
 * @param code - Unit code or alias
 * @returns Unit definition
 * @throws UnknownUnitError if unit is not found
 */
export function getLengthUnit(code: string): UnitDefinition {
   // Check direct code match
   if (code in LENGTH_UNITS) {
      return LENGTH_UNITS[code as keyof typeof LENGTH_UNITS];
   }

   // Check aliases
   for (const unit of Object.values(LENGTH_UNITS)) {
      const unitDef = unit as UnitDefinition;
      if (unitDef.aliases?.includes(code)) {
         return unitDef;
      }
   }

   throw new UnknownUnitError(code);
}

/**
 * Check if a code is a valid length unit (including aliases)
 * @param code - Unit code or alias
 * @returns True if valid length unit
 */
export function isLengthUnit(code: string): boolean {
   try {
      getLengthUnit(code);
      return true;
   } catch {
      return false;
   }
}
