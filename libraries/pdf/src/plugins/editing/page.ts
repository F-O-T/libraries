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

		// Escape special PDF string characters
		const escaped = text
			.replace(/\\/g, "\\\\")
			.replace(/\(/g, "\\(")
			.replace(/\)/g, "\\)");

		this.operators.push("BT");
		this.operators.push(`/F1 ${size} Tf`);
		this.operators.push(`${x} ${y} Td`);
		this.operators.push(`(${escaped}) Tj`);
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
		return new TextEncoder().encode(content);
	}

	/**
	 * Get image references used in drawing operations
	 */
	getImageRefs(): Map<string, number> {
		return new Map(this.imageRefs);
	}
}
