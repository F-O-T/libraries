/**
 * Zod schemas for digital certificate configuration validation
 */

import { z } from "zod";

// =============================================================================
// Sign Options Schema
// =============================================================================

export const signatureAlgorithmSchema = z.enum(["sha1", "sha256"]);

export const signOptionsSchema = z.object({
   referenceUri: z.string(),
   algorithm: signatureAlgorithmSchema.default("sha256"),
   signatureParent: z.string().optional(),
   includeDeclaration: z.boolean().default(true),
});

// =============================================================================
// mTLS Options Schema
// =============================================================================

export const mtlsOptionsSchema = z.object({
   caCerts: z.array(z.string()).optional(),
   rejectUnauthorized: z.boolean().default(true),
});
