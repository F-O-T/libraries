import type {
   BrazilianState,
   NCMCode,
   OperationType,
   TaxRegime,
} from "../types";

/**
 * ICMS rate configuration for a state
 */
export interface ICMSStateConfig {
   /** Default rate for internal operations */
   internal: number;
   /** Default rate for interstate operations */
   interstate: number;
   /** Optional NCM-specific rate overrides */
   ncm?: {
      [ncmCode: NCMCode]: {
         internal: number;
         interstate: number;
      };
   };
}

/**
 * ISS rate configuration for a municipality
 */
export interface ISSMunicipalityConfig {
   /** Default ISS rate */
   default: number;
   /** Optional service-specific rate overrides */
   services?: {
      [serviceCode: string]: number;
   };
}

/**
 * Complete tax rate configuration
 */
export interface TaxRateConfig {
   /** ICMS rates by state */
   icms: {
      [state in BrazilianState]?: ICMSStateConfig;
   };
   /** IPI rates by NCM code */
   ipi: {
      [ncmCode: NCMCode]: number;
   };
   /** PIS rates by tax regime */
   pis: {
      [regime in TaxRegime]?: number;
   };
   /** COFINS rates by tax regime */
   cofins: {
      [regime in TaxRegime]?: number;
   };
   /** ISS rates by municipality code */
   iss: {
      [municipalityCode: string]: ISSMunicipalityConfig;
   };
}

/**
 * Module-level storage for tax rate configuration
 */
let taxRateConfig: TaxRateConfig = {
   icms: {},
   ipi: {},
   pis: {},
   cofins: {},
   iss: {},
};

/**
 * Configure tax rates for the calculator
 *
 * @param config - Tax rate configuration
 * @remarks
 * This function merges the provided configuration with existing rates.
 * To replace the entire configuration, call clearTaxRates() first.
 */
export function configureTaxRates(config: TaxRateConfig): void {
   // Merge ICMS rates
   taxRateConfig.icms = {
      ...taxRateConfig.icms,
      ...config.icms,
   };

   // Merge IPI rates
   taxRateConfig.ipi = {
      ...taxRateConfig.ipi,
      ...config.ipi,
   };

   // Merge PIS rates
   taxRateConfig.pis = {
      ...taxRateConfig.pis,
      ...config.pis,
   };

   // Merge COFINS rates
   taxRateConfig.cofins = {
      ...taxRateConfig.cofins,
      ...config.cofins,
   };

   // Merge ISS rates
   taxRateConfig.iss = {
      ...taxRateConfig.iss,
      ...config.iss,
   };
}

/**
 * Get ICMS rate for a state and operation type
 *
 * @param state - Brazilian state code
 * @param operation - Operation type (internal or interstate)
 * @param ncm - Optional NCM code for NCM-specific rate override
 * @returns ICMS rate as decimal (e.g., 0.18 for 18%)
 * @throws Error if state is not configured
 */
export function getICMSRate(
   state: BrazilianState,
   operation: OperationType,
   ncm?: NCMCode,
): number {
   const stateConfig = taxRateConfig.icms[state];

   if (!stateConfig) {
      throw new Error(`ICMS rate not configured for state ${state}`);
   }

   // Check for NCM-specific override if NCM provided
   if (ncm && stateConfig.ncm?.[ncm]) {
      return stateConfig.ncm[ncm][operation];
   }

   // Return default rate for operation type
   return stateConfig[operation];
}

/**
 * Get IPI rate for an NCM code
 *
 * @param ncm - NCM code (8 digits)
 * @returns IPI rate as decimal (e.g., 0.05 for 5%)
 * @throws Error if NCM is not configured
 */
export function getIPIRate(ncm: NCMCode): number {
   const rate = taxRateConfig.ipi[ncm];

   if (rate === undefined) {
      throw new Error(`IPI rate not configured for NCM ${ncm}`);
   }

   return rate;
}

/**
 * Get PIS rate for a tax regime
 *
 * @param regime - Tax regime
 * @returns PIS rate as decimal (e.g., 0.0165 for 1.65%)
 * @throws Error if regime is not configured
 */
export function getPISRate(regime: TaxRegime): number {
   const rate = taxRateConfig.pis[regime];

   if (rate === undefined) {
      throw new Error(`PIS rate not configured for regime ${regime}`);
   }

   return rate;
}

/**
 * Get COFINS rate for a tax regime
 *
 * @param regime - Tax regime
 * @returns COFINS rate as decimal (e.g., 0.076 for 7.6%)
 * @throws Error if regime is not configured
 */
export function getCOFINSRate(regime: TaxRegime): number {
   const rate = taxRateConfig.cofins[regime];

   if (rate === undefined) {
      throw new Error(`COFINS rate not configured for regime ${regime}`);
   }

   return rate;
}

/**
 * Get ISS rate for a municipality
 *
 * @param municipalityCode - IBGE municipality code
 * @param serviceCode - Optional service code for service-specific rate
 * @returns ISS rate as decimal (e.g., 0.05 for 5%)
 * @throws Error if municipality is not configured
 */
export function getISSRate(
   municipalityCode: string,
   serviceCode?: string,
): number {
   const municipalityConfig = taxRateConfig.iss[municipalityCode];

   if (!municipalityConfig) {
      throw new Error(
         `ISS rate not configured for municipality ${municipalityCode}`,
      );
   }

   // Check for service-specific rate if service code provided
   if (
      serviceCode &&
      municipalityConfig.services?.[serviceCode] !== undefined
   ) {
      return municipalityConfig.services[serviceCode];
   }

   // Return default rate
   return municipalityConfig.default;
}

/**
 * Check if IPI rate exists for an NCM code
 *
 * @param ncm - NCM code (8 digits)
 * @returns true if rate exists, false otherwise
 */
export function hasIPIRate(ncm: NCMCode): boolean {
   return taxRateConfig.ipi[ncm] !== undefined;
}

/**
 * Check if ISS rate exists for a municipality
 *
 * @param municipalityCode - IBGE municipality code
 * @returns true if rate exists, false otherwise
 */
export function hasISSRate(municipalityCode: string): boolean {
   return taxRateConfig.iss[municipalityCode] !== undefined;
}

/**
 * Clear all configured tax rates
 *
 * @remarks
 * Useful for testing and resetting configuration
 */
export function clearTaxRates(): void {
   taxRateConfig = {
      icms: {},
      ipi: {},
      pis: {},
      cofins: {},
      iss: {},
   };
}

/**
 * Get current tax rate configuration
 *
 * @returns Current tax rate configuration
 * @remarks
 * Useful for debugging and introspection
 */
export function getTaxRateConfig(): TaxRateConfig {
   return taxRateConfig;
}
