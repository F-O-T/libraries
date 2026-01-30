import { z } from "zod";
import { fetchApi } from "./client";

/**
 * Schema for domain status from Registro.br
 */
const DomainStatusSchema = z.object({
   status_code: z.number(),
   status: z.string(),
   fqdn: z.string(),
   hosts: z.array(z.string()),
   "publication-status": z.string(),
   "expires-at": z.string(),
   suggestions: z.array(z.string()),
});

/**
 * Type for domain status from Registro.br
 */
export type DomainStatus = z.infer<typeof DomainStatusSchema>;

/**
 * Get status of a .br domain from Registro.br
 *
 * @param domain - The .br domain to check (e.g., "google.com.br")
 * @returns Domain status information including availability, hosts, and
 * expiration
 * @throws {BrasilApiNetworkError} On network errors
 * @throws {BrasilApiResponseError} On invalid response
 *
 * @example
 * ```typescript
 * const status = await getDomainStatus("google.com.br");
 * console.log(status);
 * // {
 * //   status_code: 1,
 * //   status: "REGISTERED",
 * //   fqdn: "google.com.br",
 * //   hosts: ["ns1.google.com", "ns2.google.com"],
 * //   publication_status: "published",
 * //   expires_at: "2025-12-31T23:59:59.000Z",
 * //   suggestions: []
 * // }
 * ```
 */
export async function getDomainStatus(domain: string): Promise<DomainStatus> {
   return fetchApi(`/registrobr/v1/${domain}`, DomainStatusSchema);
}
