/**
 * PdfDocument implementation for the editing plugin
 *
 * Manages loading an existing PDF, tracking modifications, and producing an
 * incremental update (appended after the original %%EOF) that adds or
 * overrides objects without rewriting the original content.
 */

import {
	parsePdfStructure,
	getMediaBox,
	extractObjectDictContent,
	parseResourcesDict,
	mergeResourcesDicts,
} from "./parser.ts";
import { PdfPageImpl } from "./page.ts";
import type {
	PdfDocument,
	PdfImage,
	PdfPage,
	SignaturePlaceholderOptions,
} from "./types.ts";

const BYTE_RANGE_PLACEHOLDER = "0 0000000000 0000000000 0000000000";
const DEFAULT_SIGNATURE_LENGTH = 16384;

const latin1Encoder = new TextEncoder(); // UTF-8 but we only feed ASCII/latin1-safe chars
const latin1Decoder = new TextDecoder("latin1");

/**
 * Parse PNG IHDR to extract width, height, bit depth, and colour type.
 */
function parsePngIhdr(data: Uint8Array): {
	width: number;
	height: number;
	bitDepth: number;
	colorType: number;
} {
	// PNG signature: 8 bytes, then first chunk is IHDR
	const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
	for (let i = 0; i < sig.length; i++) {
		if (data[i] !== sig[i]) throw new Error("Not a valid PNG file");
	}

	// IHDR chunk starts at offset 8
	// 4 bytes length + 4 bytes "IHDR" + 13 bytes data
	const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
	const chunkType = latin1Decoder.decode(data.slice(12, 16));
	if (chunkType !== "IHDR") throw new Error("First PNG chunk is not IHDR");

	return {
		width: view.getUint32(16),
		height: view.getUint32(20),
		bitDepth: data[24]!,
		colorType: data[25]!,
	};
}

/**
 * Extract and concatenate all IDAT chunk data from a PNG
 */
function extractIdatData(data: Uint8Array): Uint8Array {
	const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
	const chunks: Uint8Array[] = [];
	let offset = 8; // skip PNG signature

	while (offset < data.length) {
		const chunkLen = view.getUint32(offset);
		const chunkType = latin1Decoder.decode(data.slice(offset + 4, offset + 8));

		if (chunkType === "IDAT") {
			chunks.push(data.slice(offset + 8, offset + 8 + chunkLen));
		}

		// skip: length(4) + type(4) + data(chunkLen) + crc(4)
		offset += 12 + chunkLen;
	}

	if (chunks.length === 0) throw new Error("No IDAT chunks found in PNG");

	// Concatenate all IDAT data
	const totalLen = chunks.reduce((s, c) => s + c.length, 0);
	const result = new Uint8Array(totalLen);
	let pos = 0;
	for (const chunk of chunks) {
		result.set(chunk, pos);
		pos += chunk.length;
	}
	return result;
}

export class PdfDocumentImpl implements PdfDocument {
	private originalData: Uint8Array;
	private structure: ReturnType<typeof parsePdfStructure>;
	private pages: PdfPageImpl[] = [];
	private nextObjNum: number;
	private fontObjNum: number;
	private embeddedImages: Array<{
		objNum: number;
		width: number;
		height: number;
		idatData: Uint8Array;
		colorType: number;
		bitDepth: number;
	}> = [];

	constructor(data: Uint8Array) {
		this.originalData = data;
		this.structure = parsePdfStructure(data);

		// Allocate a font object number right away (Helvetica)
		this.nextObjNum = this.structure.size;
		this.fontObjNum = this.nextObjNum++;

		// Build page objects
		for (let i = 0; i < this.structure.pageNums.length; i++) {
			const pageNum = this.structure.pageNums[i]!;
			const mediaBox = getMediaBox(data, pageNum);
			const width = mediaBox[2] - mediaBox[0];
			const height = mediaBox[3] - mediaBox[1];
			const dictContent = this.structure.pageDictContents[i]!;
			const page = new PdfPageImpl(pageNum, width, height, dictContent);
			page.fontObjNum = this.fontObjNum;
			this.pages.push(page);
		}
	}

	get pageCount(): number {
		return this.pages.length;
	}

	getPage(index: number): PdfPage {
		if (index < 0 || index >= this.pages.length) {
			throw new Error(
				`Page index ${index} out of range (0-${this.pages.length - 1})`,
			);
		}
		return this.pages[index]!;
	}

	embedPng(data: Uint8Array): PdfImage {
		const ihdr = parsePngIhdr(data);
		const idatData = extractIdatData(data);
		const objNum = this.nextObjNum++;

		this.embeddedImages.push({
			objNum,
			width: ihdr.width,
			height: ihdr.height,
			idatData,
			colorType: ihdr.colorType,
			bitDepth: ihdr.bitDepth,
		});

		return {
			objectNumber: objNum,
			width: ihdr.width,
			height: ihdr.height,
		};
	}

	/**
	 * Save the modified PDF using an incremental update
	 */
	save(): Uint8Array {
		return this.buildIncrementalUpdate(false).pdf;
	}

	/**
	 * Save with a signature placeholder for digital signing
	 */
	saveWithPlaceholder(options: SignaturePlaceholderOptions): {
		pdf: Uint8Array;
		byteRange: [number, number, number, number];
	} {
		return this.buildIncrementalUpdate(true, options);
	}

	private buildIncrementalUpdate(
		withSignature: boolean,
		sigOptions?: SignaturePlaceholderOptions,
	): { pdf: Uint8Array; byteRange: [number, number, number, number] } {
		const objects: Array<{ objNum: number; content: string; streamData?: Uint8Array }> = [];
		let currentNextObj = this.nextObjNum;

		// --- 1. Font object (Helvetica, always emitted if any page is dirty) ---
		const anyDirty = this.pages.some((p) => p.dirty);
		if (anyDirty || this.embeddedImages.length > 0) {
			objects.push({
				objNum: this.fontObjNum,
				content: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
			});
		}

		// --- 2. Embedded image XObjects ---
		for (const img of this.embeddedImages) {
			const colorSpace = img.colorType === 2 ? "/DeviceRGB" : img.colorType === 0 ? "/DeviceGray" : "/DeviceRGB";
			const colors = img.colorType === 2 ? 3 : 1;
			const bpc = img.bitDepth;

			// PNG IDAT data uses per-row filter bytes. Tell the PDF reader
			// via DecodeParms with Predictor 15 (PNG optimum prediction).
			objects.push({
				objNum: img.objNum,
				content: [
					"<< /Type /XObject",
					"/Subtype /Image",
					`/Width ${img.width}`,
					`/Height ${img.height}`,
					`/ColorSpace ${colorSpace}`,
					`/BitsPerComponent ${bpc}`,
					"/Filter /FlateDecode",
					`/DecodeParms << /Predictor 15 /Colors ${colors} /BitsPerComponent ${bpc} /Columns ${img.width} >>`,
					`/Length ${img.idatData.length}`,
					">>",
				].join("\n"),
				streamData: img.idatData,
			});
		}

		// --- 3. Content streams for dirty pages ---
		const contentStreamMap = new Map<number, number>(); // pageObjNum -> contentStreamObjNum
		for (const page of this.pages) {
			if (!page.dirty) continue;
			const contentObjNum = currentNextObj++;
			contentStreamMap.set(page.pageObjNum, contentObjNum);
			const streamData = page.buildContentStream();
			objects.push({
				objNum: contentObjNum,
				content: `<< /Length ${streamData.length} >>`,
				streamData,
			});
		}

		// --- 4. Updated page dictionaries (add new content stream + font/image resources) ---
		for (const page of this.pages) {
			if (!page.dirty && !this.hasImagesForPage(page)) continue;

			let pageContent = page.originalDictContent;

			// Add or replace Contents reference if page is dirty
			if (page.dirty) {
				const contentObjNum = contentStreamMap.get(page.pageObjNum)!;

				if (pageContent.match(/\/Contents\s/)) {
					// Replace existing Contents with an array: [original, new]
					pageContent = pageContent.replace(
						/\/Contents\s+(\d+\s+\d+\s+R)/,
						`/Contents [$1 ${contentObjNum} 0 R]`,
					);
					// Also handle existing Contents arrays
					pageContent = pageContent.replace(
						/\/Contents\s*\[([^\]]+)\]/,
						(match, inner) => {
							// If we already added our ref above, skip
							if (inner.includes(`${contentObjNum} 0 R`)) return match;
							return `/Contents [${inner.trim()} ${contentObjNum} 0 R]`;
						},
					);
				} else {
					pageContent += `\n/Contents ${contentObjNum} 0 R`;
				}
			}

			// Build signature's new resources
			const newResourceParts: string[] = [];
			newResourceParts.push(`/Font << /F1 ${this.fontObjNum} 0 R >>`);

			// Image resources
			const imageRefs = page.dirty ? (page as PdfPageImpl).getImageRefs() : new Map<string, number>();
			if (imageRefs.size > 0) {
				const xobjEntries = Array.from(imageRefs.entries())
					.map(([name, objNum]) => `/${name} ${objNum} 0 R`)
					.join(" ");
				newResourceParts.push(`/XObject << ${xobjEntries} >>`);
			}

			const newResources: Record<string, string> = {};
			for (const part of newResourceParts) {
				const [resType, ...rest] = part.split(/\s+/);
				if (resType) {
					newResources[resType] = rest.join(" ");
				}
			}

			// Parse existing Resources from page
			const existingResources = parseResourcesDict(pageContent, this.originalData);

			// Merge existing with new
			const mergedResources = mergeResourcesDicts(existingResources, newResources);

			// Build merged Resources dictionary string
			const resourceEntries = Object.entries(mergedResources)
				.map(([name, value]) => `${name} ${value}`)
				.join("\n");

			// Update page content with merged Resources
			if (pageContent.match(/\/Resources\s*<</)) {
				// Replace existing inline Resources
				const resIdx = pageContent.indexOf("/Resources");
				const resStart = pageContent.indexOf("<<", resIdx);
				if (resStart !== -1) {
					const resEnd = findMatchingDictEndInContent(pageContent, resStart);
					if (resEnd !== -1) {
						pageContent =
							pageContent.slice(0, resStart) +
							`<< ${resourceEntries} >>` +
							pageContent.slice(resEnd + 2);
					}
				}
			} else if (pageContent.match(/\/Resources\s+\d+\s+\d+\s+R/)) {
				// Replace indirect reference with merged inline dictionary
				pageContent = pageContent.replace(
					/\/Resources\s+\d+\s+\d+\s+R/,
					`/Resources << ${resourceEntries} >>`,
				);
			} else {
				// No resources at all — add them
				pageContent += `\n/Resources << ${resourceEntries} >>`;
			}

			objects.push({
				objNum: page.pageObjNum,
				content: `<<${pageContent}\n>>`,
			});
		}

		// --- 5. Signature placeholder objects (if requested) ---
		let sigObjNum = 0;
		let widgetObjNum = 0;
		let acroFormObjNum = 0;

		if (withSignature && sigOptions) {
			sigObjNum = currentNextObj++;
			widgetObjNum = currentNextObj++;
			acroFormObjNum = currentNextObj++;

			const signatureLength = sigOptions.signatureLength ?? DEFAULT_SIGNATURE_LENGTH;
			const reason = sigOptions.reason ?? "Digitally signed";
			const name = sigOptions.name ?? "Digital Signature";
			const location = sigOptions.location ?? "";
			const contactInfo = sigOptions.contactInfo ?? "";
			const signingTime = formatPdfDate(new Date());
			const contentsPlaceholder = "0".repeat(signatureLength * 2);

			const sigParts = [
				"<< /Type /Sig",
				"/Filter /Adobe.PPKLite",
				"/SubFilter /adbe.pkcs7.detached",
				`/ByteRange [${BYTE_RANGE_PLACEHOLDER}]`,
				`/Contents <${contentsPlaceholder}>`,
				`/Reason ${pdfString(reason)}`,
				`/M ${pdfString(signingTime)}`,
				`/Name ${pdfString(name)}`,
			];
			if (location) sigParts.push(`/Location ${pdfString(location)}`);
			if (contactInfo) sigParts.push(`/ContactInfo ${pdfString(contactInfo)}`);
			sigParts.push(">>");

			objects.push({ objNum: sigObjNum, content: sigParts.join("\n") });

			// Widget annotation
			const firstPageNum = this.structure.pageNums[0]!;
			objects.push({
				objNum: widgetObjNum,
				content: [
					"<< /Type /Annot",
					"/Subtype /Widget",
					"/FT /Sig",
					"/Rect [0 0 0 0]",
					`/V ${sigObjNum} 0 R`,
					`/T ${pdfString("Signature1")}`,
					"/F 4",
					`/P ${firstPageNum} 0 R`,
					">>",
				].join("\n"),
			});

			// AcroForm
			objects.push({
				objNum: acroFormObjNum,
				content: [
					"<< /Type /AcroForm",
					"/SigFlags 3",
					`/Fields [${widgetObjNum} 0 R]`,
					">>",
				].join("\n"),
			});

			// Updated Root catalog with AcroForm
			let rootContent = this.structure.rootDictContent;
			rootContent = rootContent.replace(/\/AcroForm\s+\d+\s+\d+\s+R/g, "");
			rootContent = rootContent.replace(/\/Perms\s*<<[^>]*>>/g, "");
			rootContent = rootContent.replace(/\/Perms\s+\d+\s+\d+\s+R/g, "");

			objects.push({
				objNum: this.structure.rootNum,
				content: `<<${rootContent}\n/AcroForm ${acroFormObjNum} 0 R\n>>`,
			});

			// Updated first page with Annots
			const firstPage = this.pages[0]!;
			let pageContent: string;

			// Check if we already have this page in objects (from dirty page update)
			const existingPageObj = objects.find((o) => o.objNum === firstPage.pageObjNum);
			if (existingPageObj) {
				// Extract content from existing updated page (strip outer << >>)
				pageContent = existingPageObj.content.slice(2, existingPageObj.content.length - 2);
			} else {
				pageContent = firstPage.originalDictContent;
			}

			if (pageContent.includes("/Annots")) {
				const bracketEnd = pageContent.indexOf("]", pageContent.indexOf("/Annots"));
				pageContent =
					pageContent.slice(0, bracketEnd) +
					` ${widgetObjNum} 0 R` +
					pageContent.slice(bracketEnd);
			} else {
				pageContent += `\n/Annots [${widgetObjNum} 0 R]`;
			}

			// Update or add the page object
			if (existingPageObj) {
				existingPageObj.content = `<<${pageContent}\n>>`;
			} else {
				objects.push({
					objNum: firstPage.pageObjNum,
					content: `<<${pageContent}\n>>`,
				});
			}
		}

		// --- Serialise incremental update ---
		const newSize = currentNextObj;
		const appendParts: Uint8Array[] = [];
		const objectOffsets: Array<{ objNum: number; offset: number }> = [];

		// Compute starting byte offset (after original data)
		let currentOffset = this.originalData.length;

		for (const obj of objects) {
			// Separator newline
			const sep = latin1Encoder.encode("\n");
			appendParts.push(sep);
			currentOffset += sep.length;

			objectOffsets.push({ objNum: obj.objNum, offset: currentOffset });

			if (obj.streamData) {
				// Object with stream
				const header = latin1Encoder.encode(`${obj.objNum} 0 obj\n${obj.content}\nstream\n`);
				appendParts.push(header);
				currentOffset += header.length;

				appendParts.push(obj.streamData);
				currentOffset += obj.streamData.length;

				const footer = latin1Encoder.encode("\nendstream\nendobj\n");
				appendParts.push(footer);
				currentOffset += footer.length;
			} else {
				const objBytes = latin1Encoder.encode(
					`${obj.objNum} 0 obj\n${obj.content}\nendobj\n`,
				);
				appendParts.push(objBytes);
				currentOffset += objBytes.length;
			}
		}

		// Xref table
		const xrefOffset = currentOffset;
		const xrefStr = buildXrefTable(objectOffsets);
		const xrefBytes = latin1Encoder.encode(xrefStr);
		appendParts.push(xrefBytes);
		currentOffset += xrefBytes.length;

		// Trailer
		const trailerLines = ["<<", `/Size ${newSize}`, `/Root ${this.structure.rootNum} 0 R`];
		if (this.structure.infoNum !== null) {
			trailerLines.push(`/Info ${this.structure.infoNum} 0 R`);
		}
		trailerLines.push(`/Prev ${this.structure.xrefOffset}`, ">>");

		const trailerStr =
			`trailer\n${trailerLines.join("\n")}\nstartxref\n${xrefOffset}\n%%EOF`;
		const trailerBytes = latin1Encoder.encode(trailerStr);
		appendParts.push(trailerBytes);

		// Combine original + append parts
		const totalAppendLength = appendParts.reduce((s, p) => s + p.length, 0);
		const result = new Uint8Array(this.originalData.length + totalAppendLength);
		result.set(this.originalData, 0);
		let pos = this.originalData.length;
		for (const part of appendParts) {
			result.set(part, pos);
			pos += part.length;
		}

		// --- Calculate byte range for signature ---
		let byteRange: [number, number, number, number] = [0, 0, 0, 0];

		if (withSignature) {
			const { br, updatedPdf } = updateByteRange(result);
			byteRange = br;
			return { pdf: updatedPdf, byteRange };
		}

		return { pdf: result, byteRange };
	}

	private hasImagesForPage(page: PdfPageImpl): boolean {
		return page.dirty && page.getImageRefs().size > 0;
	}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildXrefTable(
	entries: Array<{ objNum: number; offset: number }>,
): string {
	const sorted = [...entries].sort((a, b) => a.objNum - b.objNum);

	const subsections: Array<{ start: number; offsets: number[] }> = [];
	for (const entry of sorted) {
		const last = subsections[subsections.length - 1];
		if (last && entry.objNum === last.start + last.offsets.length) {
			last.offsets.push(entry.offset);
		} else {
			subsections.push({ start: entry.objNum, offsets: [entry.offset] });
		}
	}

	let result = "xref\n";
	for (const sub of subsections) {
		result += `${sub.start} ${sub.offsets.length}\n`;
		for (const offset of sub.offsets) {
			result += `${String(offset).padStart(10, "0")} 00000 n \n`;
		}
	}
	return result;
}

function formatPdfDate(date: Date): string {
	const y = date.getUTCFullYear();
	const m = String(date.getUTCMonth() + 1).padStart(2, "0");
	const d = String(date.getUTCDate()).padStart(2, "0");
	const h = String(date.getUTCHours()).padStart(2, "0");
	const min = String(date.getUTCMinutes()).padStart(2, "0");
	const s = String(date.getUTCSeconds()).padStart(2, "0");
	return `D:${y}${m}${d}${h}${min}${s}Z`;
}

function pdfString(str: string): string {
	const escaped = str
		.replace(/\\/g, "\\\\")
		.replace(/\(/g, "\\(")
		.replace(/\)/g, "\\)");
	return `(${escaped})`;
}

/**
 * Find and update the ByteRange placeholder in the PDF, returning the
 * actual byte range values and the updated PDF bytes.
 */
function updateByteRange(pdf: Uint8Array): {
	br: [number, number, number, number];
	updatedPdf: Uint8Array;
} {
	const pdfStr = new TextDecoder("latin1").decode(pdf);

	// Find /Contents < ... > in the signature object
	const contentsMarker = "/Contents <";
	const contentsIdx = pdfStr.lastIndexOf(contentsMarker);
	if (contentsIdx === -1) throw new Error("Cannot find Contents in signature");
	const contentsStart = contentsIdx + contentsMarker.length;
	const contentsEnd = pdfStr.indexOf(">", contentsStart);
	if (contentsEnd === -1) throw new Error("Cannot find end of Contents hex");

	// The byte range: [0, before-sig-hex, after-sig-hex, rest]
	// contentsStart - 1 is the position of '<'
	// contentsEnd + 1 is the position after '>'
	const br: [number, number, number, number] = [
		0,
		contentsStart - 1, // length1: everything before '<'
		contentsEnd + 1, // offset2: after '>'
		pdf.length - (contentsEnd + 1), // length2: rest of PDF
	];

	// Now update the ByteRange placeholder with actual values
	const byteRangeMarker = "/ByteRange [";
	const brIdx = pdfStr.lastIndexOf(byteRangeMarker);
	if (brIdx === -1) throw new Error("Cannot find ByteRange in PDF");
	const brStart = brIdx + byteRangeMarker.length;
	const brEnd = pdfStr.indexOf("]", brStart);
	if (brEnd === -1) throw new Error("Cannot find end of ByteRange");

	const placeholderLen = brEnd - brStart;
	const brValueStr = `${br[0]} ${br[1]} ${br[2]} ${br[3]}`;
	const paddedBr = brValueStr.padEnd(placeholderLen, " ");

	// Build updated PDF
	const updatedPdf = new Uint8Array(pdf.length);
	updatedPdf.set(pdf);

	// Write the byte range values
	const brBytes = new TextEncoder().encode(paddedBr);
	updatedPdf.set(brBytes, brStart);

	return { br, updatedPdf };
}

/**
 * Find matching >> for a << in a content string
 */
function findMatchingDictEndInContent(str: string, startPos: number): number {
	let depth = 0;
	let i = startPos;

	while (i < str.length - 1) {
		if (str[i] === "(") {
			i++;
			while (i < str.length && str[i] !== ")") {
				if (str[i] === "\\") i++;
				i++;
			}
			i++;
		} else if (str[i] === "<" && str[i + 1] === "<") {
			depth++;
			i += 2;
		} else if (str[i] === ">" && str[i + 1] === ">") {
			depth--;
			if (depth === 0) return i;
			i += 2;
		} else {
			i++;
		}
	}

	return -1;
}

// ---------------------------------------------------------------------------
// Signature utility exports (for use by the e-signature library)
// ---------------------------------------------------------------------------

/**
 * Find the ByteRange and Contents placeholder in a signed PDF
 */
export function findByteRange(pdfData: Uint8Array): {
	byteRange: [number, number, number, number];
	contentsStart: number;
	contentsEnd: number;
	placeholderLength: number;
} {
	const pdf = new TextDecoder("latin1").decode(pdfData);

	const contentsMarker = "/Contents <";
	const contentsIdx = pdf.lastIndexOf(contentsMarker);
	if (contentsIdx === -1) throw new Error("Could not find Contents in PDF");

	const contentsStart = contentsIdx + contentsMarker.length;
	const contentsEnd = pdf.indexOf(">", contentsStart);
	if (contentsEnd === -1) throw new Error("Could not find end of Contents field");

	const placeholderLength = contentsEnd - contentsStart;

	const byteRange: [number, number, number, number] = [
		0,
		contentsStart - 1,
		contentsEnd + 1,
		pdfData.length - (contentsEnd + 1),
	];

	return { byteRange, contentsStart, contentsEnd, placeholderLength };
}

/**
 * Extract the bytes that need to be signed according to the ByteRange
 */
export function extractBytesToSign(
	pdfData: Uint8Array,
	byteRange: [number, number, number, number],
): Uint8Array {
	const [offset1, length1, offset2, length2] = byteRange;

	if (offset1 < 0 || length1 <= 0 || offset2 <= 0 || length2 <= 0) {
		throw new Error(`Invalid ByteRange values: [${byteRange.join(", ")}]`);
	}

	if (offset1 + length1 > pdfData.length || offset2 + length2 > pdfData.length) {
		throw new Error("ByteRange exceeds PDF data size");
	}

	const chunk1 = pdfData.slice(offset1, offset1 + length1);
	const chunk2 = pdfData.slice(offset2, offset2 + length2);

	const result = new Uint8Array(chunk1.length + chunk2.length);
	result.set(chunk1, 0);
	result.set(chunk2, chunk1.length);
	return result;
}

/**
 * Embed a signature (as raw bytes) into the Contents placeholder
 */
export function embedSignature(
	pdfData: Uint8Array,
	signature: Uint8Array,
): Uint8Array {
	const { contentsStart, placeholderLength } = findByteRange(pdfData);

	// Convert signature to hex
	const hexChars: string[] = [];
	for (let i = 0; i < signature.length; i++) {
		hexChars.push(signature[i]!.toString(16).padStart(2, "0"));
	}
	const signatureHex = hexChars.join("");

	if (signatureHex.length > placeholderLength) {
		throw new Error(
			`Signature too large: ${signatureHex.length} hex chars, placeholder is ${placeholderLength}`,
		);
	}

	const paddedHex = signatureHex.padEnd(placeholderLength, "0");
	const hexBytes = new TextEncoder().encode(paddedHex);

	const result = new Uint8Array(pdfData.length);
	result.set(pdfData);
	result.set(hexBytes, contentsStart);
	return result;
}
