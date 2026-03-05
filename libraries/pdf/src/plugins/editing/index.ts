/**
 * PDF Editing Plugin
 *
 * Load existing PDFs, modify them (draw text, rectangles, images),
 * and save with incremental updates. Also supports creating signature
 * placeholders for digital signing workflows.
 */

export type {
	PdfDocument,
	PdfPage,
	PdfImage,
	TextOptions,
	RectOptions,
	ImageOptions,
	SignaturePlaceholderOptions,
} from "./types.ts";

export { PdfDocumentImpl } from "./document.ts";

export {
	findByteRange,
	extractBytesToSign,
	embedSignature,
} from "./document.ts";

import { PdfDocumentImpl } from "./document.ts";
import { parsePdfStructure } from "./parser.ts";
import type { PdfDocument } from "./types.ts";

/**
 * Load an existing PDF for editing
 *
 * @param data - The PDF file contents as a Uint8Array
 * @returns A PdfDocument that can be modified and saved
 */
export function loadPdf(data: Uint8Array): PdfDocument {
	return new PdfDocumentImpl(data);
}

/**
 * Count the number of pages in a PDF without fully loading it.
 *
 * @param data - The PDF file contents as a Uint8Array
 * @returns The number of pages in the PDF
 */
export function countPdfPages(data: Uint8Array): number {
	const pdfStr = new TextDecoder("latin1").decode(data);
	const structure = parsePdfStructure(pdfStr);
	return structure.pageNums.length;
}
