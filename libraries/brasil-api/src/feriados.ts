import { z } from "zod";
import { BrasilApiValidationError } from "./errors";

/**
 * Schema for validating year input
 */
const YearInputSchema = z
   .number()
   .int({ message: "Year must be an integer" })
   .min(1900, { message: "Year must be between 1900 and 2199" })
   .max(2199, { message: "Year must be between 1900 and 2199" });

/**
 * Schema for a single holiday (feriado)
 */
const FeriadoSchema = z.object({
   date: z.string(),
   name: z.string(),
   type: z.string(),
});

/**
 * Type for a Brazilian national holiday
 */
export type Feriado = z.infer<typeof FeriadoSchema>;

/**
 * Schema for array of holidays
 */
const FeriadosArraySchema = z.array(FeriadoSchema);

/**
 * Base URL for Brasil API
 */
const BRASIL_API_BASE_URL = "https://brasilapi.com.br/api";

/**
 * Get Brazilian national holidays for a given year
 *
 * @param year - Year to get holidays for (must be between 1900 and 2199)
 * @returns Array of holidays with date, name, and type
 * @throws {BrasilApiValidationError} If year is invalid
 *
 * @example
 * ```typescript
 * const holidays = await getFeriados(2024);
 * console.log(holidays);
 * // [
 * //   { date: "2024-01-01", name: "Confraternização mundial", type: "national" },
 * //   { date: "2024-04-21", name: "Tiradentes", type: "national" },
 * //   ...
 * // ]
 * ```
 */
export async function getFeriados(year: number): Promise<Feriado[]> {
   // Validate input
   const yearValidation = YearInputSchema.safeParse(year);
   if (!yearValidation.success) {
      throw new BrasilApiValidationError(
         "Invalid year parameter",
         yearValidation.error,
         "input",
      );
   }

   // Make API request
   const url = `${BRASIL_API_BASE_URL}/feriados/v1/${year}`;
   const response = await fetch(url);

   if (!response.ok) {
      throw new Error(
         `Failed to fetch holidays: ${response.status} ${response.statusText}`,
      );
   }

   const data = await response.json();

   // Validate and parse response
   const parsed = FeriadosArraySchema.parse(data);

   return parsed;
}
