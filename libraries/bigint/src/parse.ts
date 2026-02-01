import { ParseInputSchema, type ParseInput } from "./schemas";
import { bankersRound, roundUp, roundDown } from "./round";

/**
 * Parse a decimal string or number to a scaled bigint value
 * @param value - The number or string to parse
 * @param scale - Number of decimal places to preserve
 * @param roundingMode - How to handle excess decimals (default: "truncate")
 * @returns BigInt representing value * 10^scale
 */
export function parseToBigInt(input: ParseInput): bigint {
  // Validate input
  const { value, scale, roundingMode = "truncate" } = ParseInputSchema.parse(input);

  // Convert to string for uniform processing
  const stringValue = typeof value === "number" ? value.toString() : value;

  // Normalize the string
  const normalized = stringValue.trim();

  // Check for negative
  const isNegative = normalized.startsWith("-");
  const absStr = isNegative ? normalized.slice(1) : normalized;

  // Split into integer and decimal parts
  const [integerPart = "0", decimalPart = ""] = absStr.split(".");

  // Remove leading zeros from integer part (except single zero)
  const cleanInteger = integerPart.replace(/^0+(\d)/, "$1") || "0";

  // Determine actual decimal digits
  const actualDecimals = decimalPart.length;

  let amount: bigint;

  if (actualDecimals <= scale) {
    // Pad with zeros to reach target scale
    const paddedDecimals = decimalPart.padEnd(scale, "0");
    amount = BigInt(cleanInteger + paddedDecimals);
  } else {
    // Need to round - too many decimal places
    const mode = roundingMode;

    if (mode === "truncate") {
      const keptDecimals = decimalPart.slice(0, scale);
      amount = BigInt(cleanInteger + keptDecimals);
    } else {
      // Parse with full precision, then round
      const fullAmount = BigInt(cleanInteger + decimalPart);
      const extraDigits = decimalPart.length - scale;
      const divisor = 10n ** BigInt(extraDigits);

      if (mode === "round") {
        amount = bankersRound(fullAmount, divisor);
      } else if (mode === "ceil") {
        amount = roundUp(fullAmount, divisor);
      } else {
        // floor
        amount = roundDown(fullAmount, divisor);
      }
    }
  }

  return isNegative ? -amount : amount;
}
