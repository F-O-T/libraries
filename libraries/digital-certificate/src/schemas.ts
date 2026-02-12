/**
 * Zod schemas for digital certificate configuration validation
 */

import { z } from "zod";

// =============================================================================
// Sign Options Schema
// =============================================================================

export const signatureAlgorithmSchema = z.enum(["sha1", "sha256"]);

export const signOptionsSchema = z.object({
   certificate: z.lazy(() => certificateInfoSchema),
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
// Certificate Info Schema
// =============================================================================

const certificateSubjectSchema = z.object({
   commonName: z.string().nullable(),
   organization: z.string().nullable(),
   organizationalUnit: z.string().nullable(),
   country: z.string().nullable(),
   state: z.string().nullable(),
   locality: z.string().nullable(),
   raw: z.string(),
});

const certificateIssuerSchema = z.object({
   commonName: z.string().nullable(),
   organization: z.string().nullable(),
   country: z.string().nullable(),
   raw: z.string(),
});

const certificateValiditySchema = z.object({
   notBefore: z.date(),
   notAfter: z.date(),
});

const brazilianFieldsSchema = z.object({
   cnpj: z.string().nullable(),
   cpf: z.string().nullable(),
});

export const certificateInfoSchema = z.object({
   serialNumber: z.string(),
   subject: certificateSubjectSchema,
   issuer: certificateIssuerSchema,
   validity: certificateValiditySchema,
   fingerprint: z.string(),
   isValid: z.boolean(),
   brazilian: brazilianFieldsSchema,
   certPem: z.string(),
   keyPem: z.string(),
   pfxBuffer: z.instanceof(Buffer),
   pfxPassword: z.string(),
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
   textColor: z.string().default("#000000"),
   backgroundColor: z.string().default("#FFFFFF"),
   borderColor: z.string().default("#000000"),
   fontSize: z.number().default(10),
   borderWidth: z.number().default(2),
});

export const signatureAppearanceOptionsSchema = z.object({
   visible: z.boolean().default(true),
   placement: signaturePlacementSchema.optional(),
   showQRCode: z.boolean().default(true),
   style: signatureAppearanceStyleSchema.optional(),
   customText: z.string().optional(),
});

export const signPdfOptionsSchema = z.object({
   certificate: certificateInfoSchema,
   appearance: signatureAppearanceOptionsSchema.optional(),
   reason: z.string().default("Assinado digitalmente"),
   location: z.string().optional(),
   contactInfo: z.string().optional(),
});
