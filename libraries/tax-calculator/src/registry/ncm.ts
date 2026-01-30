import { NCMCodeSchema } from "../schemas";

/**
 * NCM (Nomenclatura Comum do Mercosul) details
 */
export interface NCMDetails {
   code: string;
   description: string;
   notes?: string;
}

/**
 * Internal registry storing NCM codes and their details
 */
const ncmRegistry = new Map<string, NCMDetails>();

/**
 * Validates NCM code format (8 digits)
 * Throws error if invalid
 *
 * @param code - NCM code to validate
 * @throws Error if code format is invalid
 */
export function validateNCM(code: string): void {
   NCMCodeSchema.parse(code);
}

/**
 * Registers an NCM code with description and optional notes
 *
 * @param code - NCM code (8 digits)
 * @param description - Description of the NCM code
 * @param notes - Optional additional notes
 * @throws Error if code format is invalid
 */
export function registerNCM(
   code: string,
   description: string,
   notes?: string,
): void {
   validateNCM(code);

   const details: NCMDetails = {
      code,
      description,
   };

   if (notes !== undefined) {
      details.notes = notes;
   }

   ncmRegistry.set(code, details);
}

/**
 * Gets NCM details for a registered code
 *
 * @param code - NCM code (8 digits)
 * @returns NCM details
 * @throws Error if code is not registered or format is invalid
 */
export function getNCM(code: string): NCMDetails {
   validateNCM(code);

   const details = ncmRegistry.get(code);
   if (!details) {
      throw new Error(`NCM code ${code} is not registered`);
   }

   return details;
}

/**
 * Checks if an NCM code is registered
 *
 * @param code - NCM code (8 digits)
 * @returns true if code is registered, false otherwise
 * @throws Error if code format is invalid
 */
export function hasNCM(code: string): boolean {
   validateNCM(code);
   return ncmRegistry.has(code);
}

/**
 * Clears all registered NCM codes
 * Useful for testing and resetting state
 */
export function clearNCM(): void {
   ncmRegistry.clear();
}
