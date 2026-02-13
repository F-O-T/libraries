import type { QrCodeOptions } from "./types.ts";
import { qrCodeOptionsSchema } from "./schemas.ts";
import { encodeData, getMinVersion } from "./qr-data.ts";
import { generateErrorCorrection } from "./error-correction.ts";
import {
  createMatrix,
  placeFunctionPatterns,
  placeDataBits,
  applyFormatInfo,
  applyVersionInfo,
} from "./matrix.ts";
import { applyMask, selectBestMask } from "./masking.ts";
import { encodePng } from "./png.ts";

/**
 * Generate a QR code as a PNG image buffer.
 *
 * @param data - The string data to encode
 * @param options - Optional configuration (size, errorCorrection, margin)
 * @returns PNG image as Uint8Array
 */
export function generateQrCode(data: string, options?: QrCodeOptions): Uint8Array {
  // Validate and apply defaults
  const opts = qrCodeOptionsSchema.parse(options ?? {});

  // Encode data bytes
  const dataBytes = new TextEncoder().encode(data);

  // Determine minimum version
  const version = getMinVersion(dataBytes.length, opts.errorCorrection);

  // Encode data into codewords
  const dataCodewords = encodeData(data, version, opts.errorCorrection);

  // Generate error correction and interleave
  const finalCodewords = generateErrorCorrection(dataCodewords, version, opts.errorCorrection);

  // Build the QR matrix
  const matrix = createMatrix(version);
  placeFunctionPatterns(matrix, version);
  placeDataBits(matrix, finalCodewords);

  // Select best mask pattern
  const maskPattern = selectBestMask(matrix);

  // Apply the selected mask
  applyMask(matrix, maskPattern);

  // Apply format information
  applyFormatInfo(matrix, opts.errorCorrection, maskPattern);

  // Apply version information (version 7+)
  if (version >= 7) {
    applyVersionInfo(matrix, version);
  }

  // Render to PNG
  return encodePng(matrix.modules, opts.size, opts.margin);
}
