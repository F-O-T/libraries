/**
 * Visual Signature Appearance
 *
 * Draws certificate information and QR code on the PDF page
 * following the ICP-Brasil standard visual signature layout.
 */

import type { CertificateInfo } from "@f-o-t/digital-certificate";
import type {
   PdfDocument,
   PdfImage,
   PdfPage,
} from "@f-o-t/pdf/plugins/editing";
import { generateQrCode } from "@f-o-t/qrcode";
import type { QrCodeConfig, SignatureAppearance } from "./types.ts";

const VALIDATION_URL = "https://validar.iti.gov.br";

/**
 * Draw the visual signature appearance on a PDF page.
 *
 * Includes optional QR code and certificate information text
 * inside a bordered rectangle following ICP-Brasil layout.
 */
export function drawSignatureAppearance(
   doc: PdfDocument,
   page: PdfPage,
   appearance: SignatureAppearance,
   certInfo: CertificateInfo | null,
   options: {
      reason?: string;
      location?: string;
      qrCode?: QrCodeConfig;
      pdfData: Uint8Array;
      preEmbeddedQr?: PdfImage;
   },
): void {
   const { x, width, height } = appearance;
   const showQrCode = appearance.showQrCode !== false;
   const showCertInfo = appearance.showCertInfo !== false;

   // Convert from top-left origin (user-facing) to PDF bottom-left origin.
   const y = page.height - appearance.y - height;

   let qrSize = 0;

   // Draw QR code if requested (enabled by default)
   if (showQrCode) {
      const qrImage =
         options.preEmbeddedQr ??
         (() => {
            const qrData = options.qrCode?.data ?? VALIDATION_URL;
            const qrPng = generateQrCode(qrData, {
               size: options.qrCode?.size ?? 100,
            });
            return doc.embedPng(qrPng);
         })();

      qrSize = Math.min(50, height - 15);

      page.drawImage(qrImage, {
         x: x + 5,
         y: y + height - 11 - qrSize,
         width: qrSize,
         height: qrSize,
      });
   }

   // Draw certificate info text
   if (showCertInfo) {
      drawCertInfo(page, certInfo, {
         x,
         y,
         width,
         height,
         qrOffset: qrSize > 0 ? qrSize + 12 : 8,
      });
   }

   // Reference link above the box
   const linkText = "validar.iti.gov.br";
   const linkX = x + width / 2 - linkText.length * 2;
   page.drawLink(linkText, VALIDATION_URL, {
      x: linkX,
      y: y + height + 3,
      size: 5,
      color: "#888888",
   });
}

/**
 * Draw certificate information text on the page following ICP-Brasil layout.
 */
function drawCertInfo(
   page: PdfPage,
   certInfo: CertificateInfo | null,
   opts: {
      x: number;
      y: number;
      width: number;
      height: number;
      qrOffset: number;
   },
): void {
   const textX = opts.x + opts.qrOffset;
   let textY = opts.y + opts.height - 11;
   const fontSize = 5;
   const lineHeight = 7;

   // Green header
   page.drawText("ASSINADO DIGITALMENTE", {
      x: textX,
      y: textY,
      size: 6,
      color: "#008000",
   });
   textY -= lineHeight * 1.2;

   if (certInfo) {
      // Signer name — strip trailing :CNPJ or :CPF suffix (shown separately below)
      let signerName = certInfo.subject.commonName || "N/A";
      signerName = signerName.replace(/:\d{11,14}$/, "").trim();
      page.drawText(`Signat\u00e1rio: ${signerName}`, {
         x: textX,
         y: textY,
         size: fontSize,
      });
      textY -= lineHeight;

      // Organization (if available)
      if (certInfo.subject.organization) {
         page.drawText(`Empresa: ${certInfo.subject.organization}`, {
            x: textX,
            y: textY,
            size: fontSize,
         });
         textY -= lineHeight;
      }

      // CNPJ or CPF
      if (certInfo.brazilian.cnpj) {
         const cnpj = formatCnpj(certInfo.brazilian.cnpj);
         page.drawText(`CNPJ: ${cnpj}`, {
            x: textX,
            y: textY,
            size: fontSize,
         });
         textY -= lineHeight;
      } else if (certInfo.brazilian.cpf) {
         const cpf = formatCpf(certInfo.brazilian.cpf);
         page.drawText(`CPF: ${cpf}`, {
            x: textX,
            y: textY,
            size: fontSize,
         });
         textY -= lineHeight;
      }

      // Date and time
      const now = new Date();
      const dateStr = now.toLocaleDateString("pt-BR");
      const timeStr = now.toLocaleTimeString("pt-BR");
      page.drawText(`Data: ${dateStr} ${timeStr}`, {
         x: textX,
         y: textY,
         size: fontSize,
      });
      textY -= lineHeight;

      // Certificate type
      page.drawText("Certificado: ICP-Brasil (A1)", {
         x: textX,
         y: textY,
         size: fontSize,
      });
   } else {
      // Fallback if cert info not available
      page.drawText("Assinatura Digital", {
         x: textX,
         y: textY,
         size: fontSize,
      });
   }
}

/**
 * Pre-compute the QR code image and embed it once into the PDF document.
 * Call this before an appearances loop so all appearances share a single XObject.
 */
export function precomputeSharedQrImage(
   doc: PdfDocument,
   certInfo: CertificateInfo | null,
   pdfData: Uint8Array,
   qrConfig?: QrCodeConfig,
): PdfImage {
   const qrData = qrConfig?.data ?? VALIDATION_URL;
   const qrPng = generateQrCode(qrData, { size: qrConfig?.size ?? 100 });
   return doc.embedPng(qrPng);
}

/**
 * Format a CNPJ number with punctuation
 */
function formatCnpj(cnpj: string): string {
   return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

/**
 * Format a CPF number with punctuation
 */
function formatCpf(cpf: string): string {
   return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}
