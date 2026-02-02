import { type Money } from "../schemas";
/**
 * Allocate Money according to ratios using the Largest Remainder Method
 *
 * This algorithm distributes money while guaranteeing that:
 * 1. sum(allocated) === original (no cents are lost or gained)
 * 2. Allocation is fair (remainders are distributed to largest fractional parts)
 * 3. Result is deterministic (same input always produces same output)
 *
 * Algorithm:
 * 1. Calculate each allocation's ideal fractional share
 * 2. Round down to get initial integer amounts
 * 3. Calculate remainders (fractional parts lost)
 * 4. Sort by remainder descending
 * 5. Distribute remaining cents one by one, starting with largest remainders
 *
 * @param money - Money to allocate
 * @param ratios - Proportions to allocate (e.g., [60, 25, 15] or [1, 1, 1])
 * @returns Array of Money values that sum to the original
 * @throws InvalidAmountError if ratios are invalid
 *
 * @example
 * allocate(of("100.00", "USD"), [60, 25, 15])  // [$60.00, $25.00, $15.00]
 * allocate(of("100.00", "USD"), [1, 1, 1])     // [$33.34, $33.33, $33.33]
 * allocate(of("10.00", "USD"), [1, 1, 1])      // [$3.34, $3.33, $3.33]
 * allocate(of("7", "JPY"), [1, 1, 1])          // [¥3, ¥2, ¥2]
 */
export declare function allocate(money: Money, ratios: number[]): Money[];
/**
 * Split Money equally among n recipients
 *
 * @param money - Money to split
 * @param count - Number of equal parts
 * @returns Array of Money values
 *
 * @example
 * split(of("100.00", "USD"), 3)  // [$33.34, $33.33, $33.33]
 * split(of("10.00", "USD"), 4)   // [$2.50, $2.50, $2.50, $2.50]
 */
export declare function split(money: Money, count: number): Money[];
