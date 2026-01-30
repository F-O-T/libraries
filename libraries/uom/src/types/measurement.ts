import type { Category } from "./category";
import type { UnitSymbol } from "./units";

/**
 * Internal representation of a measurement with BigInt precision
 * This is the runtime type used for calculations
 */
export interface Measurement {
   /**
    * The numeric value stored as BigInt for precision
    */
   value: bigint;

   /**
    * The unit symbol (e.g., 'kg', 'm', 'L')
    */
   unit: UnitSymbol;

   /**
    * The decimal scale (number of decimal places)
    */
   scale: number;

   /**
    * The measurement category (e.g., 'weight', 'length')
    */
   category: Category;
}
