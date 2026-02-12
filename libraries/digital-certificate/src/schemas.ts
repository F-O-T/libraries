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
   referenceUri: z.string().regex(/^#?[\w-]+$/, "Invalid URI reference"),
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
}).refine((val) => val.notBefore < val.notAfter, {
   message: "notBefore must be before notAfter",
});

const brazilianFieldsSchema = z.object({
   cnpj: z.string().regex(/^\d{14}$/, "CNPJ must be 14 digits").nullable(),
   cpf: z.string().regex(/^\d{11}$/, "CPF must be 11 digits").nullable(),
});

export const certificateInfoSchema = z.object({
   serialNumber: z.string(),
   subject: certificateSubjectSchema,
   issuer: certificateIssuerSchema,
   validity: certificateValiditySchema,
   fingerprint: z.string().regex(/^[a-f0-9]{64}$/, "Invalid SHA-256 fingerprint"),
   isValid: z.boolean(),
   brazilian: brazilianFieldsSchema,
   certPem: z.string().regex(/-----BEGIN CERTIFICATE-----/, "Invalid PEM certificate"),
   keyPem: z.string().regex(/-----BEGIN (RSA )?PRIVATE KEY-----/, "Invalid PEM private key"),
   pfxBuffer: z.instanceof(Buffer),
   pfxPassword: z.string(),
});

// =============================================================================
// PDF Signer Schemas
// =============================================================================

export const signaturePlacementSchema = z.object({
   page: z.number().int().default(-1),
   x: z.number().min(0).default(50),
   y: z.number().min(0).default(100),
   width: z.number().min(1).default(400),
   height: z.number().min(1).default(120),
});

export const signatureAppearanceStyleSchema = z.object({
   textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color").default("#000000"),
   backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color").default("#FFFFFF"),
   borderColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color").default("#000000"),
   fontSize: z.number().min(6).max(72).default(10),
   borderWidth: z.number().min(0).max(10).default(2),
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
