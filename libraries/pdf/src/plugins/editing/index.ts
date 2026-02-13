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
