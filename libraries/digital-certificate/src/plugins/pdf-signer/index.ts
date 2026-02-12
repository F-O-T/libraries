import { PDFDocument } from "pdf-lib";
import { plainAddPlaceholder } from "@signpdf/placeholder-plain";
import signpdf from "node-signpdf";
import { generateQRCode } from "./qr-generator";
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

    // Generate QR code if requested and appearance is specified
    if (options.qrCode && options.appearance) {
      const qrImageBuffer = await generateQRCode(options.qrCode.data);

      // Get the page to draw on
      const pageIndex = options.appearance.page;
      const pages = pdfDoc.getPages();

      if (pageIndex < 0 || pageIndex >= pages.length) {
        throw new Error(`Invalid page index: ${pageIndex}. PDF has ${pages.length} pages.`);
      }

      const page = pages[pageIndex];

      // Embed and draw QR code
      const qrImage = await pdfDoc.embedPng(qrImageBuffer);
      const qrSize = Math.min(options.qrCode.size, options.appearance.height - 10);

      // Draw background rectangle
      page.drawRectangle({
        x: options.appearance.x,
        y: options.appearance.y,
        width: options.appearance.width,
        height: options.appearance.height,
        borderWidth: 1,
      });

      // Draw QR code
      page.drawImage(qrImage, {
        x: options.appearance.x + 5,
        y: options.appearance.y + 5,
        width: qrSize,
        height: qrSize,
      });

      // Draw signature text
      const textX = options.appearance.x + qrSize + 15;
      const textY = options.appearance.y + options.appearance.height - 15;

      page.drawText(`Signed: ${options.reason || 'Digital Signature'}`, {
        x: textX,
        y: textY,
        size: 10,
      });

      if (options.location) {
        page.drawText(`Location: ${options.location}`, {
          x: textX,
          y: textY - 15,
          size: 8,
        });
      }

      if (options.contactInfo) {
        page.drawText(`Contact: ${options.contactInfo}`, {
          x: textX,
          y: textY - 28,
          size: 8,
        });
      }
    }

    // Save the PDF without compression for better compatibility
    const modifiedPdfBuffer = Buffer.from(await pdfDoc.save({ useObjectStreams: false }));

    // Add signature placeholder
    const pdfWithPlaceholder = plainAddPlaceholder({
      pdfBuffer: modifiedPdfBuffer,
      reason: options.reason || "Digitally signed",
      contactInfo: options.contactInfo,
      name: options.certificate.name || "Digital Signature",
      location: options.location,
    });

    // Sign the PDF
    const signedPdf = signpdf.sign(
      pdfWithPlaceholder, 
      options.certificate.p12,
      {
        passphrase: options.certificate.password || '',
      }
    );

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
