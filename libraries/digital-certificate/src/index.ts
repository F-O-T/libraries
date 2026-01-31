/**
 * @f-o-t/digital-certificate — Brazilian A1 digital certificate handling
 *
 * Certificate management (parse, validate, extract info).
 * Sub-exports available:
 * - `@f-o-t/digital-certificate/plugins/xml-signer` — XML digital signature
 * - `@f-o-t/digital-certificate/plugins/mtls` — Mutual TLS configuration
 *
 * @packageDocumentation
 */

// =============================================================================
// Certificate Management
// =============================================================================

export {
   daysUntilExpiry,
   getPemPair,
   isCertificateValid,
   parseCertificate,
} from "./certificate.ts";

// =============================================================================
// Types
// =============================================================================

export type {
   BrazilianFields,
   CertificateInfo,
   CertificateIssuer,
   CertificateSubject,
   CertificateValidity,
   MtlsOptions,
   PemPair,
   SignatureAlgorithm,
   SignOptions,
} from "./types.ts";

// =============================================================================
// Schemas
// =============================================================================

export {
   mtlsOptionsSchema,
   signatureAlgorithmSchema,
   signOptionsSchema,
} from "./schemas.ts";

// =============================================================================
// Utilities
// =============================================================================

export {
   BRAZILIAN_OIDS,
   DIGEST_ALGORITHMS,
   EXC_C14N_NS,
   extractCnpj,
   extractCpf,
   parseDistinguishedName,
   pemToBase64,
   SIGNATURE_ALGORITHMS,
   TRANSFORM_ALGORITHMS,
   XMLDSIG_NS,
} from "./utils.ts";
