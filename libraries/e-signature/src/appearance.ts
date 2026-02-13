/**
 * Visual Signature Appearance
 *
 * Draws certificate information and QR code on the PDF page
 * for visible digital signatures.
 */

import type { CertificateInfo } from "@f-o-t/digital-certificate";
import type { PdfPage, PdfDocument } from "@f-o-t/pdf/plugins/editing";
import { generateQrCode } from "@f-o-t/qrcode";
import { hash } from "@f-o-t/crypto";
import type { SignatureAppearance, QrCodeConfig } from "./types.ts";

/**
 * Draw the visual signature appearance on a PDF page.
 *
 * Includes optional QR code and certificate information text.
 */
export function drawSignatureAppearance(
	doc: PdfDocument,
	page: PdfPage,
	appearance: SignatureAppearance,
	certInfo: CertificateInfo | null,
	options: {
		reason?: string;
		location?: string;
		qrCode?: QrCodeConfig;
		pdfData: Uint8Array;
	},
): void {
	const { x, y, width, height } = appearance;
	const showQrCode = appearance.showQrCode !== false;
	const showCertInfo = appearance.showCertInfo !== false;

	let qrSize = 0;

	// Draw QR code if requested
	if (showQrCode && options.qrCode) {
		const qrData =
			options.qrCode.data ||
			createVerificationData(certInfo, options.pdfData);

		const qrPng = generateQrCode(qrData, {
			size: options.qrCode.size || 100,
		});

		const qrImage = doc.embedPng(qrPng);
		qrSize = Math.min(100, height - 20);

		page.drawImage(qrImage, {
			x: x + 10,
			y: y + 10,
			width: qrSize,
			height: qrSize,
		});
	}

	// Draw certificate info text
	if (showCertInfo) {
		drawCertInfo(page, certInfo, {
			x,
			y,
			width,
			height,
			qrOffset: qrSize > 0 ? qrSize + 20 : 10,
			reason: options.reason,
			location: options.location,
		});
	}
}

/**
 * Draw certificate information text on the page
 */
function drawCertInfo(
	page: PdfPage,
	certInfo: CertificateInfo | null,
	opts: {
		x: number;
		y: number;
		width: number;
		height: number;
		qrOffset: number;
		reason?: string;
		location?: string;
	},
): void {
	const textX = opts.x + opts.qrOffset;
	let textY = opts.y + opts.height - 20;
	const fontSize = 10;
	const lineHeight = 14;

	// Header
	page.drawText("ASSINADO DIGITALMENTE", {
		x: textX,
		y: textY,
		size: 12,
	});
	textY -= lineHeight * 1.5;

	if (certInfo) {
		// Signer name
		const signerName = certInfo.subject.commonName || "N/A";
		page.drawText(`Assinado por: ${signerName}`, {
			x: textX,
			y: textY,
			size: fontSize,
		});
		textY -= lineHeight;

		// CNPJ or CPF
		if (certInfo.brazilian.cnpj) {
			const cnpj = formatCnpj(certInfo.brazilian.cnpj);
			page.drawText(`CNPJ: ${cnpj}`, {
				x: textX,
				y: textY,
				size: fontSize,
			});
			textY -= lineHeight;
		} else if (certInfo.brazilian.cpf) {
			const cpf = formatCpf(certInfo.brazilian.cpf);
			page.drawText(`CPF: ${cpf}`, {
				x: textX,
				y: textY,
				size: fontSize,
			});
			textY -= lineHeight;
		}

		// Date and time
		const now = new Date();
		const dateStr = now.toLocaleDateString("pt-BR");
		const timeStr = now.toLocaleTimeString("pt-BR");
		page.drawText(`Data: ${dateStr} ${timeStr}`, {
			x: textX,
			y: textY,
			size: fontSize,
		});
		textY -= lineHeight;

		// Location
		if (opts.location) {
			page.drawText(`Local: ${opts.location}`, {
				x: textX,
				y: textY,
				size: fontSize - 1,
			});
		}
	} else {
		// Fallback if cert info not available
		page.drawText(`Signed: ${opts.reason || "Digital Signature"}`, {
			x: textX,
			y: textY,
			size: fontSize,
		});
		textY -= lineHeight;

		if (opts.location) {
			page.drawText(`Location: ${opts.location}`, {
				x: textX,
				y: textY,
				size: fontSize,
			});
		}
	}
}

/**
 * Generate verification data for the QR code
 */
function createVerificationData(
	certInfo: CertificateInfo | null,
	pdfData: Uint8Array,
): string {
	const documentHash = toHex(hash("sha256", pdfData));
	const timestamp = new Date().toISOString();

	if (certInfo) {
		const certFingerprint = certInfo.fingerprint;
		return (
			`https://validar.iti.gov.br/?` +
			`doc=${documentHash.substring(0, 16)}&` +
			`cert=${certFingerprint.substring(0, 16)}&` +
			`time=${encodeURIComponent(timestamp)}`
		);
	}

	return `https://validar.iti.gov.br/?doc=${documentHash.substring(0, 16)}&time=${encodeURIComponent(timestamp)}`;
}

/**
 * Format a CNPJ number with punctuation
 */
function formatCnpj(cnpj: string): string {
	return cnpj.replace(
		/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
		"$1.$2.$3/$4-$5",
	);
}

/**
 * Format a CPF number with punctuation
 */
function formatCpf(cpf: string): string {
	return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

/**
 * Convert bytes to hex string
 */
function toHex(data: Uint8Array): string {
	const chars: string[] = [];
	for (let i = 0; i < data.length; i++) {
		chars.push(data[i]!.toString(16).padStart(2, "0"));
	}
	return chars.join("");
}
