import QRCode from "qrcode";
import type { CertificateInfo } from "../../types";

/**
 * Generate QR code as PNG buffer
 */
export async function generateQRCode(data: string): Promise<Buffer> {
	const buffer = await QRCode.toBuffer(data, {
		errorCorrectionLevel: "M",
		type: "png",
		margin: 1,
		width: 100,
	});
	return buffer;
}

/**
 * Create verification data string for QR code
 */
export function createVerificationData(
	cert: CertificateInfo,
	documentHash: string,
): string {
	const timestamp = new Date().toISOString();
	return `CERT:${cert.fingerprint}\nDOC:${documentHash}\nTIME:${timestamp}`;
}
