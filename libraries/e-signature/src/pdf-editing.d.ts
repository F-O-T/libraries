declare module "@f-o-t/pdf/plugins/editing" {
	export type PdfDocument = {
		pageCount: number;
		getPage(index: number): PdfPage;
		embedPng(data: Uint8Array): PdfImage;
		save(): Uint8Array;
		saveWithPlaceholder(options: SignaturePlaceholderOptions): {
			pdf: Uint8Array;
			byteRange: [number, number, number, number];
		};
	};

	export type PdfPage = {
		width: number;
		height: number;
		drawText(text: string, options: TextOptions): void;
		drawRectangle(options: RectOptions): void;
		drawImage(image: PdfImage, options: ImageOptions): void;
	};

	export type PdfImage = {
		readonly objectNumber: number;
		readonly width: number;
		readonly height: number;
	};

	export type TextOptions = {
		x: number;
		y: number;
		size?: number;
		color?: string;
	};

	export type RectOptions = {
		x: number;
		y: number;
		width: number;
		height: number;
		color?: string;
		borderColor?: string;
		borderWidth?: number;
	};

	export type ImageOptions = {
		x: number;
		y: number;
		width: number;
		height: number;
	};

	export type SignaturePlaceholderOptions = {
		reason?: string;
		name?: string;
		location?: string;
		contactInfo?: string;
		signatureLength?: number;
		docMdpPermission?: 1 | 2 | 3;
	};

	export function loadPdf(data: Uint8Array): PdfDocument;

	export function findByteRange(pdfData: Uint8Array): {
		byteRange: [number, number, number, number];
		contentsStart: number;
		contentsEnd: number;
		placeholderLength: number;
	};

	export function extractBytesToSign(
		pdfData: Uint8Array,
		byteRange: [number, number, number, number],
	): Uint8Array;

	export function embedSignature(
		pdfData: Uint8Array,
		signature: Uint8Array,
	): Uint8Array;
}

declare module "@f-o-t/pdf/plugins/generation" {
	export class PDFDocument {
		constructor(options?: { version?: string; metadata?: Record<string, string> });
		addPage(options?: { width?: number; height?: number }): unknown;
		save(): Uint8Array;
	}
}
