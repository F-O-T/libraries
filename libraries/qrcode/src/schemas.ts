import { z } from "zod";

export const qrCodeOptionsSchema = z.object({
  size: z.number().int().min(1).default(200),
  errorCorrection: z.enum(["L", "M", "Q", "H"]).default("M"),
  margin: z.number().int().min(0).default(4),
});
