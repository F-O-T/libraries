/**
 * PDF Signer Plugin Types
 */

export interface QRCodeOptions {
  /** Data to encode in QR code */
  data: string;
  /** Size of QR code in pixels */
  size: number;
}

export interface SignatureAppearance {
  /** Page number (0-indexed) */
  page: number;
  /** X coordinate from left (in points) */
  x: number;
  /** Y coordinate from bottom (in points) */
  y: number;
  /** Width of signature box (in points) */
  width: number;
  /** Height of signature box (in points) */
  height: number;
}

export interface Certificate {
  /** P12/PFX certificate buffer for signing */
  p12: Buffer;
  /** Password for P12/PFX file */
  password?: string;
  /** Optional signer name to display in signature */
  name?: string;
}

export interface SignPdfOptions {
  /** Certificate for signing (P12/PFX format) */
  certificate: Certificate;
  /** Reason for signing */
  reason?: string;
  /** Location where signing occurred */
  location?: string;
  /** Contact information */
  contactInfo?: string;
  /** Optional QR code to embed */
  qrCode?: QRCodeOptions;
  /** Optional signature appearance configuration */
  appearance?: SignatureAppearance;
}
