/**
 * Mutual TLS (mTLS) utilities
 *
 * Create TLS secure contexts and HTTPS agents for mutual TLS
 * authentication using Brazilian A1 digital certificates.
 */

import https from "node:https";
import tls from "node:tls";
import { mtlsOptionsSchema } from "./schemas.ts";
import type { CertificateInfo, MtlsOptions, PemPair } from "./types.ts";

// =============================================================================
// Public API
// =============================================================================

/**
 * Create a TLS SecureContext for use with mTLS connections
 *
 * @param certificate - The parsed certificate
 * @param options - Additional mTLS options
 * @returns A tls.SecureContext configured for mTLS
 */
export function createTlsContext(
   certificate: CertificateInfo,
   options?: Omit<MtlsOptions, "certificate">,
): tls.SecureContext {
   const opts = mtlsOptionsSchema.parse(options ?? {});

   const contextOptions: tls.SecureContextOptions = {
      pfx: certificate.pfxBuffer,
      passphrase: certificate.pfxPassword,
   };

   if (opts.caCerts && opts.caCerts.length > 0) {
      contextOptions.ca = opts.caCerts;
   }

   return tls.createSecureContext(contextOptions);
}

/**
 * Create an HTTPS Agent configured for mTLS
 *
 * Use this agent with Node.js http/https requests or compatible
 * HTTP clients (e.g., axios, node-fetch with agent option).
 *
 * @param certificate - The parsed certificate
 * @param options - Additional mTLS options
 * @returns An https.Agent configured for mTLS
 */
export function createHttpsAgent(
   certificate: CertificateInfo,
   options?: Omit<MtlsOptions, "certificate">,
): https.Agent {
   const opts = mtlsOptionsSchema.parse(options ?? {});

   const agentOptions: https.AgentOptions = {
      pfx: certificate.pfxBuffer,
      passphrase: certificate.pfxPassword,
      rejectUnauthorized: opts.rejectUnauthorized,
   };

   if (opts.caCerts && opts.caCerts.length > 0) {
      agentOptions.ca = opts.caCerts;
   }

   return new https.Agent(agentOptions);
}

/**
 * Get PEM pair (certificate + private key) for use with custom HTTP clients
 *
 * Useful when you need to pass cert/key as strings to HTTP libraries
 * that don't accept PFX directly (e.g., Bun.fetch with tls option).
 *
 * @param certificate - The parsed certificate
 * @returns Object with cert and key PEM strings
 */
export function getMtlsPemPair(certificate: CertificateInfo): PemPair {
   return {
      cert: certificate.certPem,
      key: certificate.keyPem,
   };
}
