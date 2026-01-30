import { UnknownUnitError } from "../errors";
import type { UnitDefinition } from "../types";

/**
 * Volume unit definitions
 * Base unit: liter (L)
 */
export const VOLUME_UNITS = {
   // Metric units
   L: {
      code: "L",
      name: "Liter",
      category: "volume",
      baseUnit: "L",
      conversionFactor: "1",
      symbol: "L",
      aliases: ["l", "liter", "litre"],
   },
   mL: {
      code: "mL",
      name: "Milliliter",
      category: "volume",
      baseUnit: "L",
      conversionFactor: "0.001",
      symbol: "mL",
      aliases: ["ml", "milliliter", "millilitre"],
   },
   m3: {
      code: "m3",
      name: "Cubic Meter",
      category: "volume",
      baseUnit: "L",
      conversionFactor: "1000",
      symbol: "m³",
      aliases: ["m³", "cubic meter", "cubic metre"],
   },

   // Imperial units
   gal: {
      code: "gal",
      name: "Gallon",
      category: "volume",
      baseUnit: "L",
      conversionFactor: "3.785411784",
      symbol: "gal",
      aliases: ["gallon", "gallons"],
   },
   qt: {
      code: "qt",
      name: "Quart",
      category: "volume",
      baseUnit: "L",
      conversionFactor: "0.946352946",
      symbol: "qt",
      aliases: ["quart", "quarts"],
   },
   pt: {
      code: "pt",
      name: "Pint",
      category: "volume",
      baseUnit: "L",
      conversionFactor: "0.473176473",
      symbol: "pt",
      aliases: ["pint", "pints"],
   },
   "fl-oz": {
      code: "fl-oz",
      name: "Fluid Ounce",
      category: "volume",
      baseUnit: "L",
      conversionFactor: "0.0295735295625",
      symbol: "fl oz",
      aliases: ["fl oz", "fluid ounce", "fluid ounces"],
   },
} as const satisfies Record<string, UnitDefinition>;

/**
 * Get a volume unit definition by code or alias
 * @param code - Unit code or alias
 * @returns Unit definition
 * @throws UnknownUnitError if unit is not found
 */
export function getVolumeUnit(code: string): UnitDefinition {
   // Check direct code match
   if (code in VOLUME_UNITS) {
      return VOLUME_UNITS[code as keyof typeof VOLUME_UNITS];
   }

   // Check aliases
   for (const unit of Object.values(VOLUME_UNITS)) {
      const unitDef = unit as UnitDefinition;
      if (unitDef.aliases?.includes(code)) {
         return unitDef;
      }
   }

   throw new UnknownUnitError(code);
}

/**
 * Check if a code is a valid volume unit (including aliases)
 * @param code - Unit code or alias
 * @returns True if valid volume unit
 */
export function isVolumeUnit(code: string): boolean {
   try {
      getVolumeUnit(code);
      return true;
   } catch {
      return false;
   }
}
