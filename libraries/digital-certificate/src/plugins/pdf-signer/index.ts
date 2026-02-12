import { PDFDocument, rgb } from "pdf-lib";
import { plainAddPlaceholder } from "@signpdf/placeholder-plain";
import { createHash } from "node:crypto";
import { generateQRCode } from "./qr-generator";
import { parseCertificate } from "../../certificate";
import { createPAdESSignature } from "./pades-signer";
import type { SignPdfOptions } from "./types";

/**
 * Signs a PDF document with a digital certificate and optional visual signature
 *
 * @param pdfBuffer - The PDF document as a Buffer
 * @param options - Signing options including certificate, appearance, and QR code
 * @returns The signed PDF as a Buffer
 *
 * @example
 * ```ts
 * const signedPdf = await signPdf(pdfBuffer, {
 *   certificate: { p12 },
 *   reason: "Document approval",
 *   location: "Corporate Office",
 *   contactInfo: "signer@example.com",
 *   qrCode: {
 *     data: "https://verify.example.com/doc123",
 *     size: 100
 *   },
 *   appearance: {
 *     page: 0,
 *     x: 50,
 *     y: 50,
 *     width: 300,
 *     height: 100
 *   }
 * });
 * ```
 */
export async function signPdf(
  pdfBuffer: Buffer,
  options: SignPdfOptions,
): Promise<Buffer> {
  try {
    // Load the PDF document
    const pdfDoc = await PDFDocument.load(pdfBuffer);

    // Parse certificate to get info for display
    let certInfo;
    try {
      certInfo = parseCertificate(options.certificate.p12, options.certificate.password || '');
    } catch (error) {
      // If parsing fails, continue without cert info
      console.warn('Failed to parse certificate for display:', error);
    }

    // Generate QR code if requested and appearance is specified
    if (options.qrCode && options.appearance) {
      // Calculate document hash for verification
      const documentHash = createHash('sha256').update(pdfBuffer).digest('hex');
      
      // Generate verification data
      let qrData = options.qrCode.data;
      
      // If no custom data provided, create verification URL/data
      if (!qrData && certInfo) {
        const timestamp = new Date().toISOString();
        const certFingerprint = certInfo.fingerprint;
        
        // Format verification data
        // You can replace this URL with your validation service
        qrData = `https://validar.iti.gov.br/?` +
          `doc=${documentHash.substring(0, 16)}&` +
          `cert=${certFingerprint.substring(0, 16)}&` +
          `time=${encodeURIComponent(timestamp)}`;
        
        // Alternative: Encode raw verification data
        // qrData = `VERIFICAÇÃO\n` +
        //   `Hash: ${documentHash.substring(0, 32)}...\n` +
        //   `Cert: ${certFingerprint.substring(0, 32)}...\n` +
        //   `Data: ${timestamp}`;
      }

      const qrImageBuffer = await generateQRCode(qrData);

      // Get the page to draw on
      const pageIndex = options.appearance.page;
      const pages = pdfDoc.getPages();

      if (pageIndex < 0 || pageIndex >= pages.length) {
        throw new Error(`Invalid page index: ${pageIndex}. PDF has ${pages.length} pages.`);
      }

      const page = pages[pageIndex];
      const { x, y, width, height } = options.appearance;

      // Colors
      const textColor = rgb(0, 0, 0); // Black

      // No background or border - transparent signature

      // Embed and draw QR code
      const qrImage = await pdfDoc.embedPng(qrImageBuffer);
      const qrSize = Math.min(100, height - 20);

      page.drawImage(qrImage, {
        x: x + 10,
        y: y + 10,
        width: qrSize,
        height: qrSize,
      });

      // Draw certificate information text
      const textX = x + qrSize + 20;
      let textY = y + height - 20;
      const fontSize = 10;
      const lineHeight = 14;

      // Header
      page.drawText("ASSINADO DIGITALMENTE", {
        x: textX,
        y: textY,
        size: 12,
        color: textColor,
      });
      textY -= lineHeight * 1.5;

      // Signer name
      if (certInfo) {
        const signerName = certInfo.subject.commonName || options.certificate.name || "N/A";
        page.drawText(`Assinado por: ${signerName}`, {
          x: textX,
          y: textY,
          size: fontSize,
          color: textColor,
        });
        textY -= lineHeight;

        // CNPJ or CPF
        if (certInfo.brazilian.cnpj) {
          const cnpj = certInfo.brazilian.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
          page.drawText(`CNPJ: ${cnpj}`, {
            x: textX,
            y: textY,
            size: fontSize,
            color: textColor,
          });
          textY -= lineHeight;
        } else if (certInfo.brazilian.cpf) {
          const cpf = certInfo.brazilian.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
          page.drawText(`CPF: ${cpf}`, {
            x: textX,
            y: textY,
            size: fontSize,
            color: textColor,
          });
          textY -= lineHeight;
        }

        // Date and time
        const now = new Date();
        const dateStr = now.toLocaleDateString('pt-BR');
        const timeStr = now.toLocaleTimeString('pt-BR');
        page.drawText(`Data: ${dateStr} ${timeStr}`, {
          x: textX,
          y: textY,
          size: fontSize,
          color: textColor,
        });
        textY -= lineHeight;

        // Location if provided
        if (options.location) {
          page.drawText(`Local: ${options.location}`, {
            x: textX,
            y: textY,
            size: fontSize - 1,
            color: textColor,
          });
        }
      } else {
        // Fallback if cert info not available
        page.drawText(`Signed: ${options.reason || 'Digital Signature'}`, {
          x: textX,
          y: textY,
          size: fontSize,
          color: textColor,
        });
        textY -= lineHeight;

        if (options.location) {
          page.drawText(`Location: ${options.location}`, {
            x: textX,
            y: textY,
            size: fontSize,
            color: textColor,
          });
        }
      }
    }

    // Save the PDF without compression for better compatibility
    const modifiedPdfBuffer = Buffer.from(await pdfDoc.save({ useObjectStreams: false }));

    // Add signature placeholder
    const pdfWithPlaceholder = plainAddPlaceholder({
      pdfBuffer: modifiedPdfBuffer,
      reason: options.reason || "Digitally signed",
      contactInfo: options.contactInfo,
      name: certInfo?.subject.commonName || options.certificate.name || "Digital Signature",
      location: options.location,
    });

    // Create PAdES-BES signature with ICP-Brasil attributes
    const signature = createPAdESSignature({
      p12Buffer: options.certificate.p12,
      password: options.certificate.password || '',
      pdfBuffer: modifiedPdfBuffer,
      reason: options.reason,
      location: options.location,
      contactInfo: options.contactInfo,
    });

    // Embed the signature in the placeholder
    // The placeholder reserves space with /Contents <00000...>
    // We need to replace it with our actual signature
    const signatureHex = signature.toString('hex');
    const placeholderHex = '0'.repeat(signatureHex.length);
    
    // Find and replace the placeholder
    let pdfString = pdfWithPlaceholder.toString('latin1');
    const placeholderPattern = new RegExp(`<${placeholderHex}>`, 'g');
    
    if (!placeholderPattern.test(pdfString)) {
      // Fallback: if exact match not found, find any large enough placeholder
      const paddedHex = signatureHex.padEnd(8192 * 2, '0');
      pdfString = pdfString.replace(/<0{8000,}>/g, `<${paddedHex.substring(0, 8192 * 2)}>`);
    } else {
      pdfString = pdfString.replace(placeholderPattern, `<${signatureHex}>`);
    }

    const signedPdf = Buffer.from(pdfString, 'latin1');
    return signedPdf;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to sign PDF: ${error.message}`);
    }
    throw new Error("Failed to sign PDF: Unknown error");
  }
}

/**
 * Re-export types for convenience
 */
export type {
  SignPdfOptions,
  SignatureAppearance,
  QRCodeOptions,
} from "./types";
