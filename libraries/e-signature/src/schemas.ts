/**
 * Zod schemas for input validation
 */

import { z } from "zod";

const p12BytesSchema = z.preprocess(
   (value) => normalizeBytes(value),
   z.instanceof(Uint8Array).refine((v) => v.length > 0, {
      message: "P12 data must not be empty",
   }),
);

const signatureAppearanceSchema = z.object({
   x: z.number(),
   y: z.number(),
   width: z.number().positive(),
   height: z.number().positive(),
   page: z.number().int().min(0).optional(),
   showQrCode: z.boolean().optional(),
   showCertInfo: z.boolean().optional(),
   padding: z.number().nonnegative().optional(),
   qrSize: z.number().positive().optional(),
   qrOffsetX: z.number().optional(),
   qrOffsetY: z.number().optional(),
   contentAlign: z.enum(["top", "middle", "bottom"]).optional(),
   verticalAlign: z.enum(["top", "middle", "bottom"]).optional(),
});

const qrCodeConfigSchema = z.object({
   data: z.string().optional(),
   size: z.number().int().positive().optional(),
});

export const pdfSignOptionsSchema = z.object({
   certificate: z.object({
      p12: p12BytesSchema,
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
   tsaRetries: z.number().int().min(0).optional(),
   tsaFallbackUrls: z.array(z.string().url()).optional(),
   onTimestampError: z
      .function({ input: z.tuple([z.unknown()]), output: z.void() })
      .optional(),
   appearance: z
      .union([signatureAppearanceSchema, z.literal("auto"), z.literal(false)])
      .optional(),
   appearances: z.array(signatureAppearanceSchema).optional(),
   qrCode: qrCodeConfigSchema.optional(),
   docMdpPermission: z
      .union([z.literal(1), z.literal(2), z.literal(3)])
      .optional(),
});

function normalizeBytes(value: unknown): unknown {
   if (value instanceof Uint8Array) return value;

   if (typeof value === "string") {
      return stringToBytes(value);
   }

   if (ArrayBuffer.isView(value)) {
      return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
   }

   if (value instanceof ArrayBuffer) {
      return new Uint8Array(value);
   }

   if (
      typeof SharedArrayBuffer !== "undefined" &&
      value instanceof SharedArrayBuffer
   ) {
      return new Uint8Array(value);
   }

   return value;
}

function stringToBytes(input: string): Uint8Array {
   const trimmed = input.trim();
   const dataUrlMatch = trimmed.match(/^data:[^,]*;base64,(.+)$/i);
   const payload = dataUrlMatch?.[1] ?? trimmed;

   if (payload.includes("-----BEGIN")) {
      const base64 = payload
         .replace(/-----BEGIN [^-]+-----/g, "")
         .replace(/-----END [^-]+-----/g, "")
         .replace(/\s+/g, "");
      return decodeBase64(base64);
   }

   if (/^[A-Za-z0-9+/=_\-\s]+$/.test(payload) && payload.length % 4 === 0) {
      try {
         return decodeBase64(payload.replace(/\s+/g, ""));
      } catch {
         // Fall back to binary string below.
      }
   }

   const bytes = new Uint8Array(input.length);
   for (let i = 0; i < input.length; i++) {
      bytes[i] = input.charCodeAt(i) & 0xff;
   }
   return bytes;
}

function decodeBase64(input: string): Uint8Array {
   const normalized = input.replace(/-/g, "+").replace(/_/g, "/");

   if (typeof Buffer !== "undefined" && typeof Buffer.from === "function") {
      return new Uint8Array(Buffer.from(normalized, "base64"));
   }

   const binary = atob(normalized);
   const bytes = new Uint8Array(binary.length);
   for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
   }
   return bytes;
}
