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
const DEFAULT_PADDING = 5;
const DEFAULT_QR_TEXT_GAP = 7;
const MAX_QR_SIZE = 50;
const HEADER_FONT_SIZE = 6;
const BODY_FONT_SIZE = 5;
const LINE_HEIGHT = 7;
const HEADER_TO_FIRST_LINE = LINE_HEIGHT * 1.2;

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
   const padding = Math.max(0, appearance.padding ?? DEFAULT_PADDING);
   const verticalAlign =
      appearance.verticalAlign ?? appearance.contentAlign ?? "top";

   // Convert from top-left origin (user-facing) to PDF bottom-left origin.
   const y = page.height - appearance.y - height;

   const innerHeight = Math.max(0, height - padding * 2);
   const innerTop = y + height - padding;
   const innerLeft = x + padding;

   let qrSize = 0;
   if (showQrCode) {
      const maxQrSize = Math.max(0, Math.min(MAX_QR_SIZE, innerHeight));
      const requestedQrSize = appearance.qrSize ?? maxQrSize;
      qrSize = Math.max(0, Math.min(requestedQrSize, maxQrSize));
   }

   const textMetrics = getTextMetrics(certInfo);
   const contentHeight = Math.min(
      innerHeight,
      Math.max(showQrCode ? qrSize : 0, showCertInfo ? textMetrics.height : 0),
   );

   const verticalOffset =
      verticalAlign === "middle"
         ? (innerHeight - contentHeight) / 2
         : verticalAlign === "bottom"
           ? innerHeight - contentHeight
           : 0;

   const contentTopY = innerTop - verticalOffset;
   const qrTopY = contentTopY + (appearance.qrOffsetY ?? 0);
   const qrX = innerLeft + (appearance.qrOffsetX ?? 0);
   const textX =
      innerLeft + (showQrCode && qrSize > 0 ? qrSize + DEFAULT_QR_TEXT_GAP : 0);

   // Draw QR code if requested (enabled by default)
   if (showQrCode && qrSize > 0) {
      const qrImage =
         options.preEmbeddedQr ??
         (() => {
            const qrData = options.qrCode?.data ?? VALIDATION_URL;
            const qrPng = generateQrCode(qrData, {
               size: options.qrCode?.size ?? 100,
            });
            return doc.embedPng(qrPng);
         })();

      page.drawImage(qrImage, {
         x: qrX,
         y: qrTopY - qrSize,
         width: qrSize,
         height: qrSize,
      });
   }

   // Draw certificate info text
   if (showCertInfo) {
      drawCertInfo(page, certInfo, {
         textX,
         textY: contentTopY,
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
      textX: number;
      textY: number;
   },
): void {
   const textX = opts.textX;
   let textY = opts.textY;
   const fontSize = BODY_FONT_SIZE;
   const lineHeight = LINE_HEIGHT;

   // Green header
   page.drawText("ASSINADO DIGITALMENTE", {
      x: textX,
      y: textY,
      size: HEADER_FONT_SIZE,
      color: "#008000",
   });
   textY -= HEADER_TO_FIRST_LINE;

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

function getTextMetrics(certInfo: CertificateInfo | null): { height: number } {
   let bodyLines = 1; // fallback line: "Assinatura Digital"

   if (certInfo) {
      bodyLines = 1; // Signatário
      if (certInfo.subject.organization) bodyLines += 1;
      if (certInfo.brazilian.cnpj || certInfo.brazilian.cpf) bodyLines += 1;
      bodyLines += 1; // Data
      bodyLines += 1; // Certificado
   }

   const bodySpan = Math.max(0, bodyLines - 1) * LINE_HEIGHT + BODY_FONT_SIZE;
   return {
      height: HEADER_TO_FIRST_LINE + bodySpan,
   };
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
