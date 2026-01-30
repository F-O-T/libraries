import { z } from "zod";

/**
 * PDF Reference schema
 */
export const PDFRefSchema = z.object({
   objectNumber: z.number().int().positive(),
   generation: z.number().int().nonnegative(),
});

/**
 * PDF Name schema
 */
export const PDFNameSchema = z.object({
   type: z.literal("name"),
   value: z.string(),
});

/**
 * Page size schema
 */
export const PageSizeSchema = z.union([
   z.enum(["A4", "Letter", "Legal", "A3", "A5", "Tabloid"]),
   z.object({
      width: z.number().positive(),
      height: z.number().positive(),
   }),
]);

/**
 * RGB color schema
 */
export const RGBColorSchema = z.object({
   type: z.literal("rgb"),
   r: z.number().min(0).max(1),
   g: z.number().min(0).max(1),
   b: z.number().min(0).max(1),
});

/**
 * CMYK color schema
 */
export const CMYKColorSchema = z.object({
   type: z.literal("cmyk"),
   c: z.number().min(0).max(1),
   m: z.number().min(0).max(1),
   y: z.number().min(0).max(1),
   k: z.number().min(0).max(1),
});

/**
 * Gray color schema
 */
export const GrayColorSchema = z.object({
   type: z.literal("gray"),
   gray: z.number().min(0).max(1),
});

/**
 * PDF Color schema
 */
export const PDFColorSchema = z.union([
   RGBColorSchema,
   CMYKColorSchema,
   GrayColorSchema,
]);

/**
 * Text options schema
 */
export const TextOptionsSchema = z.object({
   x: z.number(),
   y: z.number(),
   size: z.number().positive().optional(),
   font: z.string().optional(),
   color: PDFColorSchema.optional(),
   align: z.enum(["left", "center", "right"]).optional(),
});

/**
 * Rectangle options schema
 */
export const RectOptionsSchema = z.object({
   x: z.number(),
   y: z.number(),
   width: z.number().positive(),
   height: z.number().positive(),
   fill: PDFColorSchema.optional(),
   stroke: PDFColorSchema.optional(),
   lineWidth: z.number().positive().optional(),
});

/**
 * Line options schema
 */
export const LineOptionsSchema = z.object({
   x1: z.number(),
   y1: z.number(),
   x2: z.number(),
   y2: z.number(),
   color: PDFColorSchema.optional(),
   lineWidth: z.number().positive().optional(),
});

/**
 * PDF metadata schema
 */
export const PDFMetadataSchema = z.object({
   title: z.string().optional(),
   author: z.string().optional(),
   subject: z.string().optional(),
   keywords: z.array(z.string()).optional(),
   creator: z.string().optional(),
   producer: z.string().optional(),
   creationDate: z.date().optional(),
   modificationDate: z.date().optional(),
});

/**
 * PDF Dictionary schema (recursive)
 */
export const PDFDictionarySchema: z.ZodType<Record<string, any>> = z.lazy(() =>
   z.record(z.string(), PDFValueSchema)
);

/**
 * PDF Array schema (recursive)
 */
export const PDFArraySchema: z.ZodType<any[]> = z.lazy(() =>
   z.array(PDFValueSchema)
);

/**
 * PDF Stream schema
 */
export const PDFStreamSchema = z.object({
   dictionary: PDFDictionarySchema,
   data: z.instanceof(Uint8Array),
});

/**
 * PDF Value schema (recursive union)
 */
export const PDFValueSchema: z.ZodType<any> = z.lazy(() =>
   z.union([
      z.boolean(),
      z.number(),
      z.string(),
      PDFNameSchema,
      PDFArraySchema,
      PDFDictionarySchema,
      PDFStreamSchema,
      z.null(),
      PDFRefSchema,
   ])
);

/**
 * PDF Indirect Object schema
 */
export const PDFIndirectObjectSchema = z.object({
   ref: PDFRefSchema,
   value: PDFValueSchema,
});

/**
 * PDF Object Type schema
 */
export const PDFObjectTypeSchema = z.enum([
   "boolean",
   "number",
   "string",
   "name",
   "array",
   "dictionary",
   "stream",
   "null",
   "indirect",
]);

/**
 * PDF version schema
 */
export const PDFVersionSchema = z.enum(["1.4", "1.5", "1.6", "1.7"]);
