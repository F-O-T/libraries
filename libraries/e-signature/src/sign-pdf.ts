/**
 * PDF Signing — Main Entry Point
 *
 * Signs a PDF document using PAdES format with optional ICP-Brasil compliance.
 *
 * Flow:
 * 1. Parse certificate for display info
 * 2. Load PDF and draw visual appearance
 * 3. Save PDF with signature placeholder
 * 4. Find byte range and extract bytes to sign
 * 5. Build CMS/PKCS#7 SignedData with ICP-Brasil attributes
 * 6. Embed signature into PDF
 */

import type { CmsAttribute } from "@f-o-t/crypto";
import { createSignedData, parsePkcs12 } from "@f-o-t/crypto";
import type { CertificateInfo } from "@f-o-t/digital-certificate";
import { parseCertificate } from "@f-o-t/digital-certificate";
import {
   embedSignature,
   extractBytesToSign,
   findByteRange,
   loadPdf,
} from "@f-o-t/pdf/plugins/editing";
import { drawSignatureAppearance } from "./appearance.ts";
import {
   buildSignaturePolicy,
   buildSigningCertificateV2,
   ICP_BRASIL_OIDS,
} from "./icp-brasil.ts";
import { pdfSignOptionsSchema } from "./schemas.ts";
import { requestTimestamp } from "./timestamp.ts";
import type { PdfSignOptions } from "./types.ts";

/**
 * Sign a PDF document with a digital certificate.
 *
 * Supports PAdES-BES and PAdES with ICP-Brasil compliance
 * (signing-certificate-v2 and signature-policy attributes).
 *
 * @param pdf - The PDF document as a Uint8Array
 * @param options - Signing options
 * @returns The signed PDF as a Uint8Array
 *
 * @example
 * ```ts
 * const signedPdf = await signPdf(pdfBytes, {
 *   certificate: { p12, password: "secret" },
 *   reason: "Document approval",
 *   location: "Corporate Office",
 *   policy: "pades-icp-brasil",
 * });
 * ```
 */
export async function signPdf(
   pdf: Uint8Array,
   options: PdfSignOptions,
): Promise<Uint8Array> {
   // Validate input
   const opts = pdfSignOptionsSchema.parse(options);

   // 1. Parse certificate for display info (uses OpenSSL, needs Buffer)
   let certInfo: CertificateInfo | null = null;
   try {
      certInfo = parseCertificate(
         Buffer.from(opts.certificate.p12),
         opts.certificate.password,
      );
   } catch {
      // If parsing fails, continue without cert info for display
   }

   // 2. Load PDF via editing plugin
   const doc = loadPdf(pdf);

   // 3. Draw visual signature appearance if requested
   if (opts.appearance !== false && opts.appearance) {
      const pageIndex = opts.appearance.page ?? 0;

      if (pageIndex < 0 || pageIndex >= doc.pageCount) {
         throw new PdfSignError(
            `Invalid page index: ${pageIndex}. PDF has ${doc.pageCount} pages.`,
         );
      }

      const page = doc.getPage(pageIndex);

      drawSignatureAppearance(doc, page, opts.appearance, certInfo, {
         reason: opts.reason,
         location: opts.location,
         qrCode: opts.qrCode,
         pdfData: pdf,
      });
   }


   // 3b. Draw multiple visual signature appearances if provided
   if (opts.appearances && opts.appearances.length > 0) {
      for (const app of opts.appearances) {
         const pageIndex = app.page ?? 0;

         if (pageIndex < 0 || pageIndex >= doc.pageCount) {
            throw new PdfSignError(
               `Invalid page index ${pageIndex} in appearances. PDF has ${doc.pageCount} pages.`,
            );
         }

         const page = doc.getPage(pageIndex);

         drawSignatureAppearance(doc, page, app, certInfo, {
            reason: opts.reason,
            location: opts.location,
            qrCode: opts.qrCode,
            pdfData: pdf,
         });
      }
   }

   // 4. Save with signature placeholder
   const signerName =
      certInfo?.subject.commonName ||
      opts.certificate.name ||
      "Digital Signature";

   const { pdf: pdfWithPlaceholder } = doc.saveWithPlaceholder({
      reason: opts.reason || "Digitally signed",
      name: signerName,
      location: opts.location,
      contactInfo: opts.contactInfo,
      signatureLength: 16384,
      docMdpPermission: opts.docMdpPermission ?? 2,
   });

   // 5. Find byte range and extract bytes to sign
   const { byteRange } = findByteRange(pdfWithPlaceholder);
   const bytesToSign = extractBytesToSign(pdfWithPlaceholder, byteRange);

   // 6. Parse PKCS#12 for cryptographic material
   const { certificate, privateKey, chain } = parsePkcs12(
      opts.certificate.p12,
      opts.certificate.password,
   );

   // 7. Build ICP-Brasil authenticated attributes if needed
   const authenticatedAttributes: CmsAttribute[] = [];

   if (opts.policy === "pades-icp-brasil") {
      // signing-certificate-v2
      const sigCertV2 = buildSigningCertificateV2(certificate);
      authenticatedAttributes.push({
         oid: ICP_BRASIL_OIDS.signingCertificateV2,
         values: [sigCertV2],
      });

      // signature-policy
      try {
         const sigPolicy = await buildSignaturePolicy();
         authenticatedAttributes.push({
            oid: ICP_BRASIL_OIDS.signaturePolicy,
            values: [sigPolicy],
         });
      } catch {
         // Policy download failure is non-fatal
         // The signature will still be valid PAdES-BES
      }
   }

   // 8. Build unauthenticated attributes
   const unauthenticatedAttributes: CmsAttribute[] = [];

   // 9. Create CMS/PKCS#7 SignedData
   const signedData = createSignedData({
      content: bytesToSign,
      certificate,
      privateKey,
      chain,
      hashAlgorithm: "sha256",
      authenticatedAttributes:
         authenticatedAttributes.length > 0
            ? authenticatedAttributes
            : undefined,
      unauthenticatedAttributes:
         unauthenticatedAttributes.length > 0
            ? unauthenticatedAttributes
            : undefined,
      detached: true,
   });

   // 10. Optionally request timestamp
   if (opts.timestamp && opts.tsaUrl) {
      try {
         const tsToken = await requestTimestamp(signedData, opts.tsaUrl);
         // Note: Adding the timestamp as an unauthenticated attribute
         // would require re-building the CMS structure. For now, we log
         // that timestamp was received. A future version will embed it.
         // TODO: Rebuild CMS with timestamp token as unauthenticated attribute
         void tsToken;
      } catch {
         // Timestamp failure is non-fatal
      }
   }

   // 11. Embed signature into PDF
   return embedSignature(pdfWithPlaceholder, signedData);
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class PdfSignError extends Error {
   constructor(message: string) {
      super(message);
      this.name = "PdfSignError";
   }
}
