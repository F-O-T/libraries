/**
 * Configuration for Brasil API client
 */
export interface BrasilApiConfig {
   baseUrl: string;
   timeout: number;
}

/**
 * Default configuration
 */
const defaultConfig: BrasilApiConfig = {
   baseUrl: "https://brasilapi.com.br/api",
   timeout: 10000, // 10 seconds
};

let currentConfig: BrasilApiConfig = { ...defaultConfig };

/**
 * Get current configuration
 */
export function getConfig(): BrasilApiConfig {
   return currentConfig;
}

/**
 * Configure Brasil API client
 * @param config Partial configuration to merge with defaults
 */
export function configureBrasilApi(config: Partial<BrasilApiConfig>): void {
   currentConfig = { ...currentConfig, ...config };
}

/**
 * Set custom configuration (alias for configureBrasilApi)
 * @param config Partial configuration to merge with defaults
 */
export function setConfig(config: Partial<BrasilApiConfig>): void {
   configureBrasilApi(config);
}

/**
 * Reset configuration to defaults
 */
export function resetConfig(): void {
   currentConfig = { ...defaultConfig };
}
