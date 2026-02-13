import { z } from "zod";

export const hashAlgorithmSchema = z.enum(["sha256", "sha384", "sha512"]);

export const signedDataOptionsSchema = z.object({
  content: z.instanceof(Uint8Array),
  certificate: z.instanceof(Uint8Array),
  privateKey: z.instanceof(Uint8Array),
  chain: z.array(z.instanceof(Uint8Array)).optional(),
  hashAlgorithm: hashAlgorithmSchema.default("sha256"),
  authenticatedAttributes: z
    .array(
      z.object({
        oid: z.string(),
        values: z.array(z.instanceof(Uint8Array)),
      }),
    )
    .optional(),
  unauthenticatedAttributes: z
    .array(
      z.object({
        oid: z.string(),
        values: z.array(z.instanceof(Uint8Array)),
      }),
    )
    .optional(),
  detached: z.boolean().default(true),
});
