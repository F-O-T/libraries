/**
 * Types for the PDF editing plugin
 */

/**
 * A loaded PDF document that can be modified and saved
 */
export type PdfDocument = {
	/** Number of pages in the document */
	pageCount: number;
	/** Get a page by zero-based index */
	getPage(index: number): PdfPage;
	/** Embed a PNG image for use with drawImage */
	embedPng(data: Uint8Array): PdfImage;
	/** Save the modified PDF with incremental update */
	save(): Uint8Array;
	/** Save with a signature placeholder for digital signing */
	saveWithPlaceholder(options: SignaturePlaceholderOptions): {
		pdf: Uint8Array;
		byteRange: [number, number, number, number];
	};
};

/**
 * A page in a loaded PDF document
 */
export type PdfPage = {
	/** Page width in points */
	width: number;
	/** Page height in points */
	height: number;
	/** Draw text on the page */
	drawText(text: string, options: TextOptions): void;
	/** Draw a rectangle on the page */
	drawRectangle(options: RectOptions): void;
	/** Draw an embedded image on the page */
	drawImage(image: PdfImage, options: ImageOptions): void;
};

/**
 * An embedded image reference
 */
export type PdfImage = {
	/** Internal object number for the image XObject */
	readonly objectNumber: number;
	/** Image width in pixels */
	readonly width: number;
	/** Image height in pixels */
	readonly height: number;
};

/**
 * Options for drawing text
 */
export type TextOptions = {
	x: number;
	y: number;
	/** Font size in points (default: 12) */
	size?: number;
	/** Hex color string like "#000000" (default: black) */
	color?: string;
};

/**
 * Options for drawing a rectangle
 */
export type RectOptions = {
	x: number;
	y: number;
	width: number;
	height: number;
	/** Fill color as hex string */
	color?: string;
	/** Stroke/border color as hex string */
	borderColor?: string;
	/** Border line width in points */
	borderWidth?: number;
};

/**
 * Options for drawing an image
 */
export type ImageOptions = {
	x: number;
	y: number;
	width: number;
	height: number;
};

/**
 * Options for creating a signature placeholder
 */
export type SignaturePlaceholderOptions = {
	reason?: string;
	name?: string;
	location?: string;
	contactInfo?: string;
	/** Size of the signature contents in bytes (default: 16384) */
	signatureLength?: number;
	/** DocMDP permission level: 1 = no changes, 2 = form fill + sign, 3 = form fill + sign + annotate (default: 2) */
	docMdpPermission?: 1 | 2 | 3;
	/**
	 * Zero-based page index where the signature widget annotation should be placed.
	 * This should match the page where the visual signature appearance is drawn.
	 * Defaults to 0 (first page) for invisible signatures.
	 */
	appearancePage?: number;
};
