import { type DatabaseMoney, type Money, type MoneyJSON } from "../schemas";
/**
 * Convert Money to JSON representation
 *
 * Stores amount as a decimal string to preserve precision.
 *
 * @param money - Money value
 * @returns JSON-serializable object
 *
 * @example
 * toJSON(of("123.45", "USD"))
 * // { amount: "123.45", currency: "USD" }
 */
export declare function toJSON(money: Money): MoneyJSON;
/**
 * Create Money from JSON representation
 *
 * @param json - JSON object with amount and currency
 * @returns Money instance
 *
 * @example
 * fromJSON({ amount: "123.45", currency: "USD" })
 * // Money with $123.45
 */
export declare function fromJSON(json: MoneyJSON): Money;
/**
 * Convert Money to database-friendly format
 *
 * Stores amount as a string to preserve precision in databases
 * that don't support BigInt natively.
 *
 * @param money - Money value
 * @returns Database-friendly object
 *
 * @example
 * toDatabase(of("123.45", "USD"))
 * // { amount: "123.45", currency: "USD" }
 */
export declare function toDatabase(money: Money): DatabaseMoney;
/**
 * Create Money from database format
 *
 * @param data - Database object with amount and currency
 * @returns Money instance
 */
export declare function fromDatabase(data: DatabaseMoney): Money;
/**
 * Serialize Money to a compact string format
 *
 * Format: "AMOUNT CURRENCY" (e.g., "123.45 USD")
 *
 * @param money - Money value
 * @returns Compact string representation
 *
 * @example
 * serialize(of("123.45", "USD"))  // "123.45 USD"
 */
export declare function serialize(money: Money): string;
/**
 * Deserialize Money from compact string format
 *
 * @param str - String in format "AMOUNT CURRENCY"
 * @returns Money instance
 *
 * @example
 * deserialize("123.45 USD")  // Money with $123.45
 */
export declare function deserialize(str: string): Money;
