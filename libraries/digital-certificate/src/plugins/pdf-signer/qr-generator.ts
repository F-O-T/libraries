import QRCode from "qrcode";
import type { CertificateInfo } from "../../types";

/**
 * Generate a QR code as PNG buffer
 * 
 * @param data - The data to encode in the QR code
 * @returns PNG buffer of the QR code (100x100px)
 * @throws {Error} If QR code generation fails
 */
export async function generateQRCode(data: string): Promise<Buffer> {
	try {
		return await QRCode.toBuffer(data, {
			errorCorrectionLevel: "M",
			type: "png",
			width: 100,
			margin: 1,
		});
	} catch (error) {
		throw new Error(`Failed to generate QR code: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}

/**
 * Create verification data string for QR code
 * 
 * @param cert - Certificate information
 * @param documentHash - Hash of the signed document
 * @returns Formatted verification string (CERT:fingerprint\nDOC:hash\nTIME:timestamp)
 * @throws {Error} If certificate fingerprint or document hash is missing
 */
export function createVerificationData(
	cert: CertificateInfo,
	documentHash: string,
): string {
	if (!cert.fingerprint) {
		throw new Error('Certificate fingerprint is required for QR code');
	}
	if (!documentHash || documentHash.trim().length === 0) {
		throw new Error('Document hash is required for QR code');
	}
	const timestamp = new Date().toISOString();
	return `CERT:${cert.fingerprint}\nDOC:${documentHash}\nTIME:${timestamp}`;
}
