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

  // Split into integer and decimal parts
  const [integerPart = "0", decimalPart = ""] = stringValue.split(".");

  // Remove leading zeros from integer part (except single zero)
  const cleanInteger = integerPart.replace(/^(-?)0+(\d)/, "$1$2") || "0";

  // Determine actual decimal digits
  const actualDecimals = decimalPart.length;

  if (actualDecimals <= scale) {
    // Pad with zeros to reach target scale
    const paddedDecimals = decimalPart.padEnd(scale, "0");
    return BigInt(cleanInteger + paddedDecimals);
  } else {
    // Need to round - too many decimal places
    const keptDecimals = decimalPart.slice(0, scale);
    const excessDecimals = decimalPart.slice(scale);

    // Base value (before rounding)
    const baseValue = BigInt(cleanInteger + keptDecimals);

    // Determine if we need to adjust based on excess
    const isNegative = stringValue.startsWith("-");

    if (roundingMode === "truncate") {
      return baseValue;
    } else if (roundingMode === "round") {
      return bankersRound(baseValue, excessDecimals, isNegative);
    } else if (roundingMode === "ceil") {
      return roundUp(baseValue, excessDecimals, isNegative, "ceil");
    } else {
      // floor
      return roundDown(baseValue, excessDecimals, isNegative, "floor");
    }
  }
}
