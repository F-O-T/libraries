import { z } from "zod";
import { fetchApi } from "./client";
import { BrasilApiValidationError } from "./errors";

/**
 * Schema for validating ISBN input
 * ISBN must be 10 or 13 digits
 */
const IsbnInputSchema = z
   .string()
   .regex(/^(?:\d{10}|\d{13})$/, "ISBN must be 10 or 13 digits");

/**
 * Schema for book dimensions
 */
const DimensionsSchema = z.object({}).passthrough();

/**
 * Schema for ISBN response
 */
const IsbnResponseSchema = z.object({
   isbn: z.string(),
   title: z.string(),
   subtitle: z.string().nullable(),
   authors: z.array(z.string()),
   publisher: z.string(),
   synopsis: z.string().nullable(),
   dimensions: DimensionsSchema.nullable(),
   year: z.number().nullable(),
   format: z.string(),
   page_count: z.number(),
   subjects: z.array(z.string()),
   location: z.string().nullable(),
   retail_price: z.string().nullable(),
   cover_url: z.string().nullable(),
   provider: z.string(),
});

/**
 * Type for ISBN response
 */
export type IsbnResponse = z.infer<typeof IsbnResponseSchema>;

/**
 * Get book information by ISBN
 *
 * @param isbn - ISBN code (10 or 13 digits)
 * @returns Book information including title, authors, publisher, etc.
 * @throws {BrasilApiValidationError} If ISBN format is invalid
 * @throws {BrasilApiNetworkError} On network errors
 * @throws {BrasilApiResponseError} On invalid response
 *
 * @example
 * ```typescript
 * const book = await getIsbn("9788545702269");
 * console.log(book.title);
 * console.log(book.authors);
 * ```
 */
export async function getIsbn(isbn: string): Promise<IsbnResponse> {
   // Validate input
   const validationResult = IsbnInputSchema.safeParse(isbn);

   if (!validationResult.success) {
      throw new BrasilApiValidationError(
         "Invalid ISBN format",
         validationResult.error,
         "input",
      );
   }

   return fetchApi(`/isbn/v1/${isbn}`, IsbnResponseSchema);
}
