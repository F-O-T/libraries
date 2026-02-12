import type { PDFPage } from "pdf-lib";
import { rgb } from "pdf-lib";
import type {
	CertificateInfo,
	SignaturePlacement,
	SignatureAppearanceStyle,
} from "../../types";

/**
 * Default style for signature appearance
 */
const DEFAULT_STYLE: SignatureAppearanceStyle = {
	textColor: "#000000",
	backgroundColor: "#F5F5F5",
	borderColor: "#000000",
	fontSize: 8,
	borderWidth: 1,
};

/**
 * Draws a signature appearance on a PDF page
 *
 * @param page - The PDF page to draw on
 * @param cert - Certificate information
 * @param qrCodeBuffer - QR code PNG buffer
 * @param placement - Signature placement on the page
 * @param style - Visual style overrides
 */
export async function drawSignatureAppearance(
	page: PDFPage,
	cert: CertificateInfo,
	qrCodeBuffer: Buffer,
	placement: SignaturePlacement,
	style: Partial<SignatureAppearanceStyle> = {},
): Promise<void> {
	const finalStyle = { ...DEFAULT_STYLE, ...style };

	// Convert hex colors to RGB
	const bgColor = hexToRgb(finalStyle.backgroundColor!);
	const borderColor = hexToRgb(finalStyle.borderColor!);
	const textColor = hexToRgb(finalStyle.textColor!);

	// Draw background box
	page.drawRectangle({
		x: placement.x,
		y: placement.y,
		width: placement.width,
		height: placement.height,
		borderColor: rgb(borderColor.r, borderColor.g, borderColor.b),
		borderWidth: finalStyle.borderWidth!,
		color: rgb(bgColor.r, bgColor.g, bgColor.b),
	});

	// Embed QR code image
	const pdfDoc = page.doc;
	const qrImage = await pdfDoc.embedPng(qrCodeBuffer);
	const qrSize = placement.height - 10;

	page.drawImage(qrImage, {
		x: placement.x + 5,
		y: placement.y + 5,
		width: qrSize,
		height: qrSize,
	});

	// Draw certificate info text
	const textX = placement.x + qrSize + 15;
	const textY = placement.y + placement.height - 15;
	const fontSize = finalStyle.fontSize!;
	const lineHeight = fontSize + 2;

	// Format certificate data
	const commonName = cert.subject.commonName || "Unknown";
	const cpfCnpj = formatCpfCnpj(
		cert.brazilian.cnpj || cert.brazilian.cpf || "",
	);
	const validFrom = formatDate(cert.validity.notBefore);
	const validTo = formatDate(cert.validity.notAfter);

	const lines = [
		`Assinado por: ${commonName}`,
		cpfCnpj,
		`Válido de: ${validFrom}`,
		`até: ${validTo}`,
	];

	for (let i = 0; i < lines.length; i++) {
		page.drawText(lines[i], {
			x: textX,
			y: textY - i * lineHeight,
			size: fontSize,
			color: rgb(textColor.r, textColor.g, textColor.b),
		});
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
