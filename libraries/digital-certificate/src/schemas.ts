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

// =============================================================================
// PDF Signer Schemas
// =============================================================================

export const signaturePlacementSchema = z.object({
   page: z.number().int().default(-1),
   x: z.number().default(50),
   y: z.number().default(100),
   width: z.number().default(400),
   height: z.number().default(120),
});

export const signatureAppearanceStyleSchema = z.object({
   textColor: z.string().optional().default("#000000"),
   backgroundColor: z.string().optional().default("#FFFFFF"),
   borderColor: z.string().optional().default("#000000"),
   fontSize: z.number().optional().default(10),
   borderWidth: z.number().optional().default(2),
});

export const signatureAppearanceOptionsSchema = z.object({
   visible: z.boolean().default(true),
   placement: signaturePlacementSchema.optional(),
   showQRCode: z.boolean().optional().default(true),
   style: signatureAppearanceStyleSchema.optional(),
   customText: z.string().optional(),
});

export const signPdfOptionsSchema = z.object({
   appearance: signatureAppearanceOptionsSchema.optional(),
   reason: z.string().optional().default("Assinado digitalmente"),
   location: z.string().optional(),
   contactInfo: z.string().optional(),
});
