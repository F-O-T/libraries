import type { Currency } from "./types";
/**
 * ISO 4217 currency definitions
 *
 * Includes:
 * - Major world currencies (USD, EUR, GBP, etc.)
 * - Zero decimal currencies (JPY, KRW, VND)
 * - Three decimal currencies (KWD, BHD, OMR)
 * - Popular cryptocurrencies (BTC, ETH)
 */
export declare const ISO_4217_CURRENCIES: Record<string, Currency>;
