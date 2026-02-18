/**
 * @f-o-t/e-signature — PAdES PDF signing with ICP-Brasil compliance
 *
 * Signs PDF documents using CMS/PKCS#7 SignedData format with support for
 * ICP-Brasil attributes (signing-certificate-v2, signature-policy).
 *
 * @packageDocumentation
 */

export { signPdfBatch, signPdfBatchToArray } from "./batch.ts";
export type { BatchSignEvent, BatchSignInput } from "./batch.ts";
export {
   buildSignaturePolicy,
   buildSigningCertificateV2,
   clearPolicyCache,
   ICP_BRASIL_OIDS,
   SignaturePolicyError,
} from "./icp-brasil.ts";
export { pdfSignOptionsSchema } from "./schemas.ts";
export { PdfSignError, signPdf } from "./sign-pdf.ts";
export {
   requestTimestamp,
   TIMESTAMP_SERVERS,
   TIMESTAMP_TOKEN_OID,
   TimestampError,
} from "./timestamp.ts";
export type {
   PdfSignOptions,
   QrCodeConfig,
   SignatureAppearance,
} from "./types.ts";
