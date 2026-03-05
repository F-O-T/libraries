/**
 * PdfPage implementation for the editing plugin
 *
 * Collects drawing operations as PDF content stream operators.
 * The accumulated operators are later serialised as a new content stream
 * object appended via incremental update.
 */

import type { PdfImage, PdfPage, TextOptions, RectOptions, ImageOptions } from "./types.ts";

/**
 * Parse a hex colour string like "#RRGGBB" into normalised [r, g, b] values (0-1).
 * Returns null for invalid/missing input so callers can fall back to defaults.
 */
/**
 * Convert a UTF-16 JS string to a WinAnsiEncoding-escaped PDF string.
 * Characters outside WinAnsi are replaced with '?'.
 */
function toWinAnsi(text: string): string {
	let out = "";
	for (let i = 0; i < text.length; i++) {
		const code = text.charCodeAt(i);
		let byte: number;

		if (code < 0x80) {
			byte = code;
		} else {
			// Map Unicode code points to WinAnsiEncoding bytes
			byte = UNICODE_TO_WIN_ANSI.get(code) ?? 0x3f; // '?'
		}

		const ch = String.fromCharCode(byte);
		if (ch === "\\" || ch === "(" || ch === ")") {
			out += `\\${ch}`;
		} else {
			out += ch;
		}
	}
	return out;
}

/**
 * Mapping from Unicode code points to WinAnsiEncoding byte values
 * for characters in the 0x80-0xFF range that differ from Unicode.
 */
const UNICODE_TO_WIN_ANSI = new Map<number, number>([
	// 0x80-0x9F range (WinAnsi-specific mappings)
	[0x20ac, 0x80], // €
	[0x201a, 0x82], // ‚
	[0x0192, 0x83], // ƒ
	[0x201e, 0x84], // „
	[0x2026, 0x85], // …
	[0x2020, 0x86], // †
	[0x2021, 0x87], // ‡
	[0x02c6, 0x88], // ˆ
	[0x2030, 0x89], // ‰
	[0x0160, 0x8a], // Š
	[0x2039, 0x8b], // ‹
	[0x0152, 0x8c], // Œ
	[0x017d, 0x8e], // Ž
	[0x2018, 0x91], // '
	[0x2019, 0x92], // '
	[0x201c, 0x93], // "
	[0x201d, 0x94], // "
	[0x2022, 0x95], // •
	[0x2013, 0x96], // –
	[0x2014, 0x97], // —
	[0x02dc, 0x98], // ˜
	[0x2122, 0x99], // ™
	[0x0161, 0x9a], // š
	[0x203a, 0x9b], // ›
	[0x0153, 0x9c], // œ
	[0x017e, 0x9e], // ž
	[0x0178, 0x9f], // Ÿ
	// 0xA0-0xFF: Unicode and WinAnsi are identical
	...Array.from({ length: 96 }, (_, i) => [0xa0 + i, 0xa0 + i] as [number, number]),
]);

function parseHexColor(hex: string | undefined): [number, number, number] | null {
	if (!hex) return null;
	const m = hex.match(/^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/);
	if (!m) return null;
	return [
		parseInt(m[1]!, 16) / 255,
		parseInt(m[2]!, 16) / 255,
		parseInt(m[3]!, 16) / 255,
	];
}

export class PdfPageImpl implements PdfPage {
	readonly width: number;
	readonly height: number;

	/** The existing page object number in the original PDF */
	readonly pageObjNum: number;
	/** The raw dictionary content string of the original page */
	readonly originalDictContent: string;

	/** Accumulated content-stream operators added by draw* methods */
	private operators: string[] = [];

	/** Images referenced by drawImage (name -> obj num) */
	private imageRefs: Map<string, number> = new Map();

	/** Font object number allocated by the document (set externally) */
	fontObjNum = 0;

	/** Whether any drawing operations have been recorded */
	get dirty(): boolean {
		return this.operators.length > 0;
	}

	constructor(
		pageObjNum: number,
		width: number,
		height: number,
		originalDictContent: string,
	) {
		this.pageObjNum = pageObjNum;
		this.width = width;
		this.height = height;
		this.originalDictContent = originalDictContent;
	}

	/**
	 * Draw text on the page using Helvetica
	 */
	drawText(text: string, options: TextOptions): void {
		const { x, y, size = 12, color } = options;
		const rgb = parseHexColor(color);

		if (rgb) {
			this.operators.push(`${rgb[0].toFixed(3)} ${rgb[1].toFixed(3)} ${rgb[2].toFixed(3)} rg`);
		}

		// Encode text as WinAnsiEncoding and escape special PDF string characters
		const encoded = toWinAnsi(text);

		this.operators.push("BT");
		this.operators.push(`/F1 ${size} Tf`);
		this.operators.push(`${x} ${y} Td`);
		this.operators.push(`(${encoded}) Tj`);
		this.operators.push("ET");
	}

	/**
	 * Draw a rectangle on the page
	 */
	drawRectangle(options: RectOptions): void {
		const { x, y, width, height, color, borderColor, borderWidth } = options;

		const fillRgb = parseHexColor(color);
		const strokeRgb = parseHexColor(borderColor);

		if (fillRgb) {
			this.operators.push(`${fillRgb[0].toFixed(3)} ${fillRgb[1].toFixed(3)} ${fillRgb[2].toFixed(3)} rg`);
		}
		if (strokeRgb) {
			this.operators.push(`${strokeRgb[0].toFixed(3)} ${strokeRgb[1].toFixed(3)} ${strokeRgb[2].toFixed(3)} RG`);
		}
		if (borderWidth !== undefined) {
			this.operators.push(`${borderWidth} w`);
		}

		this.operators.push(`${x} ${y} ${width} ${height} re`);

		if (fillRgb && strokeRgb) {
			this.operators.push("B"); // fill and stroke
		} else if (fillRgb) {
			this.operators.push("f"); // fill only
		} else if (strokeRgb) {
			this.operators.push("S"); // stroke only
		} else {
			this.operators.push("f"); // default: fill with current colour (black)
		}
	}

	/**
	 * Draw an embedded image on the page
	 */
	drawImage(image: PdfImage, options: ImageOptions): void {
		const { x, y, width, height } = options;
		const imgName = `Im${image.objectNumber}`;
		this.imageRefs.set(imgName, image.objectNumber);

		this.operators.push("q");
		this.operators.push(`${width} 0 0 ${height} ${x} ${y} cm`);
		this.operators.push(`/${imgName} Do`);
		this.operators.push("Q");
	}

	/**
	 * Build the content stream bytes for the accumulated operators
	 */
	buildContentStream(): Uint8Array {
		const content = this.operators.join("\n");
		// Write raw bytes — toWinAnsi already produced byte values in the
		// 0x00-0xFF range. TextEncoder would re-encode bytes >= 0x80 as
		// multi-byte UTF-8 sequences, corrupting WinAnsi characters like "á".
		const bytes = new Uint8Array(content.length);
		for (let i = 0; i < content.length; i++) {
			bytes[i] = content.charCodeAt(i);
		}
		return bytes;
	}

	/**
	 * Get image references used in drawing operations
	 */
	getImageRefs(): Map<string, number> {
		return new Map(this.imageRefs);
	}
}
