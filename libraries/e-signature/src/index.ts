/**
 * @f-o-t/e-signature — PAdES PDF signing with ICP-Brasil compliance
 *
 * Signs PDF documents using CMS/PKCS#7 SignedData format with support for
 * ICP-Brasil attributes (signing-certificate-v2, signature-policy).
 *
 * @packageDocumentation
 */

export { signPdf, PdfSignError } from "./sign-pdf.ts";
export {
	buildSigningCertificateV2,
	buildSignaturePolicy,
	clearPolicyCache,
	SignaturePolicyError,
	ICP_BRASIL_OIDS,
} from "./icp-brasil.ts";
export {
	requestTimestamp,
	TimestampError,
	TIMESTAMP_SERVERS,
	TIMESTAMP_TOKEN_OID,
} from "./timestamp.ts";
export type { PdfSignOptions, SignatureAppearance, QrCodeConfig } from "./types.ts";
export { pdfSignOptionsSchema } from "./schemas.ts";
