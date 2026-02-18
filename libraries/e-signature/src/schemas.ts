/**
 * Zod schemas for input validation
 */

import { z } from "zod";

const signatureAppearanceSchema = z.object({
   x: z.number(),
   y: z.number(),
   width: z.number().positive(),
   height: z.number().positive(),
   page: z.number().int().min(0).optional(),
   showQrCode: z.boolean().optional(),
   showCertInfo: z.boolean().optional(),
});

const qrCodeConfigSchema = z.object({
   data: z.string().optional(),
   size: z.number().int().positive().optional(),
});

export const pdfSignOptionsSchema = z.object({
   certificate: z.object({
      p12: z.instanceof(Uint8Array).refine((v) => v.length > 0, {
         message: "P12 data must not be empty",
      }),
      password: z.string(),
      name: z.string().optional(),
   }),
   reason: z.string().optional(),
   location: z.string().optional(),
   contactInfo: z.string().optional(),
   policy: z.enum(["pades-ades", "pades-icp-brasil"]).optional(),
   timestamp: z.boolean().optional(),
   tsaUrl: z.string().url().optional(),
   tsaTimeout: z.number().positive().optional(),
   tsaRetries: z.number().int().min(1).optional(),
   tsaFallbackUrls: z.array(z.string().url()).optional(),
   appearance: z
      .union([signatureAppearanceSchema, z.literal(false)])
      .optional(),
   appearances: z.array(signatureAppearanceSchema).optional(),
   qrCode: qrCodeConfigSchema.optional(),
   docMdpPermission: z
      .union([z.literal(1), z.literal(2), z.literal(3)])
      .optional(),
});
