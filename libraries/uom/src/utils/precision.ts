import { InvalidMeasurementError } from "../errors";

/**
 * Default precision scale (12 decimal places)
 * Provides sufficient precision for most scientific and financial calculations
 */
export const PRECISION_SCALE = 12;

/**
 * Parse a decimal number (string or number) to BigInt with specified scale
 *
 * @param value - The numeric value as string or number
 * @param scale - The number of decimal places to preserve
 * @returns BigInt representation with the specified precision
 *
 * @example
 * ```typescript
 * parseDecimalToBigInt("10.5", 12)  // 10500000000000n
 * parseDecimalToBigInt(25.75, 12)   // 25750000000000n
 * parseDecimalToBigInt("100", 6)    // 100000000n
 * ```
 */
export function parseDecimalToBigInt(
   value: number | string,
   scale: number,
): bigint {
   if (scale < 0) {
      throw new InvalidMeasurementError("Scale must be non-negative");
   }

   const valueStr = String(value);

   // Check for invalid number formats
   if (!/^-?\d+(\.\d+)?$/.test(valueStr)) {
      throw new InvalidMeasurementError(`Invalid number format: ${valueStr}`);
   }

   const [integerPart, decimalPart = ""] = valueStr.split(".");

   // Pad or truncate decimal part to match scale
   const paddedDecimal = decimalPart.padEnd(scale, "0").slice(0, scale);

   // Combine integer and decimal parts
   const combined = integerPart + paddedDecimal;

   return BigInt(combined);
}

/**
 * Format a BigInt value to a decimal string with specified scale
 *
 * @param value - The BigInt value
 * @param scale - The number of decimal places
 * @returns String representation as decimal number
 *
 * @example
 * ```typescript
 * formatBigIntToDecimal(10500000000000n, 12)  // "10.5"
 * formatBigIntToDecimal(25750000000000n, 12)  // "25.75"
 * formatBigIntToDecimal(100000000n, 6)        // "100"
 * ```
 */
export function formatBigIntToDecimal(value: bigint, scale: number): string {
   const valueStr = value.toString();
   const isNegative = valueStr.startsWith("-");
   const absStr = isNegative ? valueStr.slice(1) : valueStr;

   // Pad with zeros if needed
   const paddedStr = absStr.padStart(scale + 1, "0");

   // Split into integer and decimal parts
   const integerPart = paddedStr.slice(0, -scale) || "0";
   const decimalPart = paddedStr.slice(-scale);

   // Remove trailing zeros from decimal part
   const trimmedDecimal = decimalPart.replace(/0+$/, "");

   const result = trimmedDecimal
      ? `${integerPart}.${trimmedDecimal}`
      : integerPart;

   return isNegative ? `-${result}` : result;
}
