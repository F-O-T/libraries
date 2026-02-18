/**
 * Types for @f-o-t/e-signature
 *
 * PAdES PDF signing with ICP-Brasil compliance.
 */

/**
 * Visual signature appearance configuration
 */
export type SignatureAppearance = {
   /** X coordinate from left (in points) */
   x: number;
   /** Y coordinate from bottom (in points) */
   y: number;
   /** Width of signature box (in points) */
   width: number;
   /** Height of signature box (in points) */
   height: number;
   /** Page number (0-indexed, default: 0) */
   page?: number;
   /** Whether to display the QR code (default: true) */
   showQrCode?: boolean;
   /** Whether to display certificate info text (default: true) */
   showCertInfo?: boolean;
};

/**
 * QR code configuration for visual signatures
 */
export type QrCodeConfig = {
   /** Custom data to encode in the QR code (auto-generated if omitted) */
   data?: string;
   /** Size of the QR code in pixels (default: 100) */
   size?: number;
};

/**
 * Options for signing a PDF document
 */
export type PdfSignOptions = {
   /** Certificate for signing */
   certificate: {
      /** PKCS#12/PFX file contents */
      p12: Uint8Array;
      /** Password for the P12/PFX file */
      password: string;
      /** Optional display name for the signer */
      name?: string;
   };
   /** Reason for signing */
   reason?: string;
   /** Location where signing occurred */
   location?: string;
   /** Contact information */
   contactInfo?: string;
   /** Signature policy: "pades-ades" (default) or "pades-icp-brasil" for ICP-Brasil compliance */
   policy?: "pades-ades" | "pades-icp-brasil";
   /** Whether to request a timestamp from a TSA */
   timestamp?: boolean;
   /** Timestamp server URL */
   tsaUrl?: string;
   /** Visual signature appearance (false to disable) */
   appearance?: SignatureAppearance | false;
   /** Multiple visual signature appearances — renders a stamp on each specified page */
   appearances?: SignatureAppearance[];
   /** QR code configuration for the visual signature */
   qrCode?: QrCodeConfig;
   /** DocMDP permission level: 1 = no changes, 2 = form fill + sign (default), 3 = form fill + sign + annotate */
   docMdpPermission?: 1 | 2 | 3;
};
