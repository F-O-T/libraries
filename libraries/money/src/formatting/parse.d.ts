import type { Money } from "../schemas";
/**
 * Parse a formatted currency string into Money
 *
 * Handles locale-specific formatting including:
 * - Different decimal separators (. or ,)
 * - Different grouping separators (, or . or space)
 * - Currency symbols and codes
 * - Negative amounts in various formats
 *
 * @param formatted - Formatted currency string (e.g., "R$ 1.234,56", "$1,234.56")
 * @param locale - Locale used for formatting (e.g., "pt-BR", "en-US")
 * @param currency - ISO 4217 currency code
 * @returns Money instance
 *
 * @example
 * parse("R$ 1.234,56", "pt-BR", "BRL")  // 1234.56 BRL
 * parse("$1,234.56", "en-US", "USD")    // 1234.56 USD
 * parse("(€1.234,56)", "de-DE", "EUR")  // -1234.56 EUR
 * parse("-¥1,234", "ja-JP", "JPY")      // -1234 JPY
 */
export declare function parse(formatted: string, locale: string, currency: string): Money;
