import { type FormatInput, FormatInputSchema } from "./schemas";

/**
 * Format a scaled bigint value to a decimal string
 * @param value - The bigint value to format
 * @param scale - Number of decimal places the value represents
 * @param trimTrailingZeros - Whether to remove trailing zeros (default: true)
 * @returns Formatted decimal string
 */
export function formatFromBigInt(input: FormatInput): string {
   // Validate input
   const {
      value,
      scale,
      trimTrailingZeros = true,
   } = FormatInputSchema.parse(input);

   // Handle zero specially
   if (value === 0n) {
      if (scale === 0 || trimTrailingZeros) {
         return "0";
      }
      return "0." + "0".repeat(scale);
   }

   // Handle scale 0 (integers)
   if (scale === 0) {
      return value.toString();
   }

   // Get absolute value and sign
   const isNegative = value < 0n;
   const absValue = isNegative ? -value : value;
   const absStr = absValue.toString();

   // Pad with leading zeros if needed
   const paddedStr = absStr.padStart(scale + 1, "0");

   // Split into integer and decimal parts
   const splitPoint = paddedStr.length - scale;
   const integerPart = paddedStr.slice(0, splitPoint);
   let decimalPart = paddedStr.slice(splitPoint);

   // Trim trailing zeros if requested
   if (trimTrailingZeros) {
      decimalPart = decimalPart.replace(/0+$/, "");
   }

   // Build result
   let result: string;
   if (decimalPart === "") {
      result = integerPart;
   } else {
      result = `${integerPart}.${decimalPart}`;
   }

   return isNegative ? `-${result}` : result;
}
