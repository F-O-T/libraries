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

import type { Asn1Node } from "@f-o-t/asn1";
import { decodeDer } from "@f-o-t/asn1";
import type { CmsAttribute } from "@f-o-t/crypto";
import {
   appendUnauthAttributes,
   createSignedData,
   parsePkcs12,
} from "@f-o-t/crypto";
import type { CertificateInfo } from "@f-o-t/digital-certificate";
import { parseCertificate } from "@f-o-t/digital-certificate";
import {
   embedSignature,
   extractBytesToSign,
   findByteRange,
   loadPdf,
} from "@f-o-t/pdf/plugins/editing";
import {
   drawSignatureAppearance,
   precomputeSharedQrImage,
} from "./appearance.ts";
import {
   buildSignaturePolicy,
   buildSigningCertificateV2,
   ICP_BRASIL_OIDS,
} from "./icp-brasil.ts";
import { pdfSignOptionsSchema } from "./schemas.ts";
import { requestTimestamp, TIMESTAMP_TOKEN_OID } from "./timestamp.ts";
import type { PdfSignOptions } from "./types.ts";

/**
 * Sign a PDF document with a digital certificate.
 *
 * Supports PAdES-BES and PAdES with ICP-Brasil compliance
 * (signing-certificate-v2 and signature-policy attributes).
 *
 * @param pdf - The PDF document as a Uint8Array or ReadableStream<Uint8Array>
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
   pdf: Uint8Array | ReadableStream<Uint8Array>,
   options: PdfSignOptions,
): Promise<Uint8Array> {
   // Accumulate ReadableStream into Uint8Array if needed
   let pdfBytes: Uint8Array;
   if (pdf instanceof ReadableStream) {
      const chunks: Uint8Array[] = [];
      const reader = pdf.getReader();
      try {
         while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) chunks.push(value);
         }
      } finally {
         reader.releaseLock();
      }
      const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
      pdfBytes = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
         pdfBytes.set(chunk, offset);
         offset += chunk.length;
      }
   } else {
      pdfBytes = pdf;
   }

   // Validate input
   const opts = pdfSignOptionsSchema.parse(options);

   // 1. Parse PKCS#12 early — needed both for display info and for sizing the
   //    signature placeholder accurately based on the actual certificate chain length.
   const { certificate, privateKey, chain } = parsePkcs12(
      opts.certificate.p12,
      opts.certificate.password,
   );

   // 1b. Parse certificate for rich display info (CPF/CNPJ, subject CN, etc.)
   let certInfo: CertificateInfo | null = null;
   try {
      certInfo = parseCertificate(
         opts.certificate.p12,
         opts.certificate.password,
      );
   } catch {
      // If parsing fails, continue without cert info for display
   }

   // 2. Load PDF via editing plugin
   const doc = loadPdf(pdfBytes);

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
         pdfData: pdfBytes,
      });
   }

   // 3b. Draw multiple visual signature appearances if provided
   if (opts.appearances && opts.appearances.length > 0) {
      // Pre-embed the QR image once so all appearances share a single PDF XObject.
      // This collapses N embedPng calls (and N IDAT buffer allocations) into 1.
      const needsQr = opts.appearances.some((a) => a.showQrCode !== false);
      // Pre-embed the QR once. Safe to pass to all appearances — drawSignatureAppearance
      // ignores it when showQrCode is false (inner guard in appearance.ts).
      const sharedQrImage = needsQr
         ? precomputeSharedQrImage(doc, certInfo, pdfBytes, opts.qrCode)
         : undefined;

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
            pdfData: pdfBytes,
            preEmbeddedQr: sharedQrImage,
         });
      }
   }

   // 4. Save with signature placeholder
   const signerName =
      certInfo?.subject.commonName ||
      opts.certificate.name ||
      "Digital Signature";

   // Dynamic placeholder size: base 8 KB + 2× actual cert chain + 4 KB for a
   // timestamp token (if configured). Prevents "Signature too large" failures for
   // certificates with long chains (5+ certs) or large RSA keys.
   const certChainBytes =
      certificate.length + chain.reduce((sum, c) => sum + c.length, 0);
   const signatureLength = Math.max(
      16384,
      certChainBytes * 2 + (opts.tsaUrl ? 4096 : 0) + 8192,
   );

   // Which page hosts the widget annotation — must match the visual appearance
   // page so PDF readers navigate to the right page when a signature is clicked.
   const appearancePage = opts.appearance
      ? ((opts.appearance as { page?: number }).page ?? 0)
      : (opts.appearances?.[0]?.page ?? 0);

   const { pdf: pdfWithPlaceholder } = doc.saveWithPlaceholder({
      reason: opts.reason || "Digitally signed",
      name: signerName,
      location: opts.location,
      contactInfo: opts.contactInfo,
      signatureLength,
      docMdpPermission: opts.docMdpPermission ?? 2,
      appearancePage,
   });

   // 5. Find byte range and extract bytes to sign
   const { byteRange } = findByteRange(pdfWithPlaceholder);
   const bytesToSign = extractBytesToSign(pdfWithPlaceholder, byteRange);

   // 6. Cryptographic material already parsed in step 1

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

   // 10. Optionally request timestamp and embed as unauthenticated attribute
   if (opts.timestamp && opts.tsaUrl) {
      try {
         const tsToken = await requestTimestamp(
            extractSignatureValue(signedData),
            opts.tsaUrl,
            "sha256",
            {
               tsaTimeout: opts.tsaTimeout,
               tsaRetries: opts.tsaRetries,
               tsaFallbackUrls: opts.tsaFallbackUrls,
            },
         );
         unauthenticatedAttributes.push({
            oid: TIMESTAMP_TOKEN_OID,
            values: [tsToken],
         });
      } catch (err) {
         // Timestamp failure is non-fatal
         opts.onTimestampError?.(err);
      }
   }

   // 11. Patch timestamp token into SignedData as unauthenticated attribute (no re-signing)
   const finalSignedData = appendUnauthAttributes(
      signedData,
      unauthenticatedAttributes,
   );

   // 12. Embed signature into PDF
   return embedSignature(pdfWithPlaceholder, finalSignedData);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Extract the raw signature value bytes from a DER-encoded CMS ContentInfo.
 *
 * Per CAdES (ETSI EN 319 122-1) / RFC 5126 §5.5.1, the id-smime-aa-timeStampToken
 * attribute must be a timestamp over the SignerInfo.signature octets, not the
 * full ContentInfo blob.
 *
 * ContentInfo → [0] EXPLICIT → SignedData → signerInfos[0] → signature OCTET STRING
 */
function extractSignatureValue(contentInfoDer: Uint8Array): Uint8Array {
   const contentInfo = decodeDer(contentInfoDer);
   const signedDataNode = (
      (contentInfo.value as Asn1Node[])[1]!.value as Asn1Node[]
   )[0]!;
   // signerInfos is always the last child of SignedData per RFC 5652
   const signerInfosSet = (signedDataNode.value as Asn1Node[]).at(-1)!;
   const signerInfo = (signerInfosSet.value as Asn1Node[])[0]!;
   const signatureNode = (signerInfo.value as Asn1Node[])[5]!;
   return signatureNode.value as Uint8Array;
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
