import { type FormatOptions, type Money } from "../schemas";
/**
 * Format Money as a localized currency string
 *
 * Uses Intl.NumberFormat for locale-aware formatting.
 *
 * @param money - Money value to format
 * @param locale - Locale for formatting (e.g., "en-US", "pt-BR")
 * @param options - Formatting options
 * @returns Formatted currency string
 *
 * @example
 * format(of("1234.56", "USD"), "en-US")           // "$1,234.56"
 * format(of("1234.56", "BRL"), "pt-BR")           // "R$ 1.234,56"
 * format(of("1234", "JPY"), "ja-JP")              // "¥1,234"
 * format(of("1234567.89", "USD"), "en-US", { notation: "compact" }) // "$1.2M"
 */
export declare function format(money: Money, locale?: string, options?: FormatOptions): string;
/**
 * Format Money as a compact string (e.g., 1.2K, 3.4M)
 *
 * @param money - Money value to format
 * @param locale - Locale for formatting
 * @returns Compact formatted string
 *
 * @example
 * formatCompact(of("1234567.89", "USD"), "en-US") // "$1.2M"
 * formatCompact(of("1234.56", "BRL"), "pt-BR")    // "R$ 1,23 mil"
 */
export declare function formatCompact(money: Money, locale?: string): string;
/**
 * Convert Money to decimal string representation
 *
 * Always includes the appropriate number of decimal places.
 * Useful for JSON serialization or display without locale formatting.
 *
 * @param money - Money value
 * @returns Decimal string (e.g., "123.45", "-50.00", "100")
 *
 * @example
 * toDecimal(of("123.45", "USD"))  // "123.45"
 * toDecimal(of("-50", "USD"))     // "-50.00"
 * toDecimal(of("100", "JPY"))     // "100"
 */
export declare function toDecimal(money: Money): string;
/**
 * Format Money without currency symbol
 *
 * @param money - Money value
 * @param locale - Locale for number formatting
 * @returns Formatted number without currency symbol
 *
 * @example
 * formatAmount(of("1234.56", "USD"), "en-US")  // "1,234.56"
 * formatAmount(of("1234.56", "BRL"), "pt-BR")  // "1.234,56"
 */
export declare function formatAmount(money: Money, locale?: string): string;
