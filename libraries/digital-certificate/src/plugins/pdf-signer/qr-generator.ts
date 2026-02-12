import QRCode from "qrcode";
import type { CertificateInfo } from "./types";

/**
 * Generate QR code as PNG buffer
 */
export async function generateQRCode(data: string): Promise<Buffer> {
	const buffer = await QRCode.toBuffer(data, {
		errorCorrectionLevel: "M",
		type: "png",
		margin: 1,
		width: 200,
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
	return [
		"Digital Certificate Verification",
		"",
		`Subject: ${cert.subject}`,
		`Issuer: ${cert.issuer}`,
		`Serial: ${cert.serialNumber}`,
		`Valid From: ${cert.validFrom}`,
		`Valid To: ${cert.validTo}`,
		"",
		`Document Hash: ${documentHash}`,
		"",
		"Verify at: [Your verification URL]",
	].join("\n");
}
