import type { PDFPage } from "pdf-lib";
import { rgb } from "pdf-lib";
import QRCode from "qrcode";

/**
 * Certificate data for signature appearance
 */
export interface CertificateData {
	commonName: string;
	cpfCnpj: string;
	validFrom: Date;
	validTo: Date;
}

/**
 * Draws a signature appearance on a PDF page
 */
export function drawSignatureAppearance(
	page: PDFPage,
	certData: CertificateData,
	x: number,
	y: number,
	width: number,
	height: number,
): void {
	// Draw background box
	page.drawRectangle({
		x,
		y,
		width,
		height,
		borderColor: rgb(0, 0, 0),
		borderWidth: 1,
		color: rgb(0.95, 0.95, 0.95),
	});

	// Generate QR code (placeholder - will contain certificate chain hash)
	const qrData = `CN:${certData.commonName}|CPF/CNPJ:${certData.cpfCnpj}`;
	const qrSize = height - 10;

	// Draw QR code placeholder (actual QR code generation happens async)
	generateQRCode(qrData, qrSize)
		.then((qrImage) => {
			// In real implementation, embed QR code image
			// For now, just draw a placeholder box
			page.drawRectangle({
				x: x + 5,
				y: y + 5,
				width: qrSize,
				height: qrSize,
				borderColor: rgb(0, 0, 0),
				borderWidth: 1,
			});
		})
		.catch(() => {
			// Silently fail QR generation
		});

	// Draw certificate info text
	const textX = x + qrSize + 15;
	const textY = y + height - 15;
	const fontSize = 8;
	const lineHeight = fontSize + 2;

	const lines = [
		`Assinado por: ${certData.commonName}`,
		`${formatCpfCnpj(certData.cpfCnpj)}`,
		`Válido de: ${formatDate(certData.validFrom)}`,
		`até: ${formatDate(certData.validTo)}`,
	];

	for (let i = 0; i < lines.length; i++) {
		page.drawText(lines[i], {
			x: textX,
			y: textY - i * lineHeight,
			size: fontSize,
			color: rgb(0, 0, 0),
		});
	}
}

/**
 * Generates a QR code as a base64 PNG
 */
async function generateQRCode(
	data: string,
	size: number,
): Promise<string | null> {
	try {
		return await QRCode.toDataURL(data, {
			width: size,
			margin: 1,
		});
	} catch {
		return null;
	}
}

/**
 * Formats CPF or CNPJ for display
 */
function formatCpfCnpj(cpfCnpj: string): string {
	const digits = cpfCnpj.replace(/\D/g, "");

	if (digits.length === 11) {
		return formatCpf(digits);
	}
	if (digits.length === 14) {
		return formatCnpj(digits);
	}
	return cpfCnpj; // Return as-is if invalid length
}

/**
 * Formats CPF: 123.456.789-01
 */
function formatCpf(cpf: string): string {
	return `CPF: ${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9, 11)}`;
}

/**
 * Formats CNPJ: 12.345.678/0001-90
 */
function formatCnpj(cnpj: string): string {
	return `CNPJ: ${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12, 14)}`;
}

/**
 * Formats date for display
 */
function formatDate(date: Date): string {
	return date.toLocaleDateString("pt-BR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
}

/**
 * Converts hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	if (!result) {
		throw new Error(`Invalid hex color: ${hex}`);
	}
	return {
		r: Number.parseInt(result[1], 16) / 255,
		g: Number.parseInt(result[2], 16) / 255,
		b: Number.parseInt(result[3], 16) / 255,
	};
}
