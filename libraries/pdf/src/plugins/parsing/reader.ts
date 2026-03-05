import { inflateSync } from "node:zlib";
import {
	parseTrailer,
	buildObjectIndex,
	extractObjectDictContent,
	getMediaBox,
} from "../editing/parser.ts";
import type { PDFRef } from "../../types.ts";
import { PDFParseError } from "../../errors.ts";

/**
 * Parsed PDF Document
 */
export interface ParsedPDF {
	version: string;
	catalog: PDFRef;
	pages: ParsedPDFPage[];
	objects: Map<number, any>;
}

/**
 * Parsed PDF Page
 */
export interface ParsedPDFPage {
	ref: PDFRef;
	size: { width: number; height: number };
	content: string;
}

/**
 * PDF Reader - reads and parses existing PDFs using string-based parsing.
 *
 * Supports both traditional xref tables and cross-reference streams (PDF 1.5+),
 * object streams, indirect Length references, and FlateDecode-compressed content streams.
 */
export class PDFReader {
	private data: Uint8Array;
	private pdfStr: string;
	private objIndex: Map<number, number>;

	constructor(data: Uint8Array) {
		this.data = data;
		// Decode as latin1 once — same approach as editing parser
		this.pdfStr = new TextDecoder("latin1").decode(data);
		this.objIndex = buildObjectIndex(this.pdfStr);
	}

	/**
	 * Parse PDF file
	 */
	parse(): ParsedPDF {
		const trailer = parseTrailer(this.pdfStr);
		const version = this.parseVersion();

		// Find page objects via Root -> Pages -> Kids
		const pageNums = this.findPageObjects(trailer.root);

		const catalogRef: PDFRef = {
			objectNumber: trailer.root,
			generation: 0,
		};

		const pages: ParsedPDFPage[] = [];
		for (const pageNum of pageNums) {
			const page = this.parsePage(pageNum);
			if (page) pages.push(page);
		}

		return {
			version,
			catalog: catalogRef,
			pages,
			objects: new Map(),
		};
	}

	/**
	 * Parse PDF version from header
	 */
	private parseVersion(): string {
		const match = this.pdfStr.slice(0, 20).match(/%PDF-(\d+\.\d+)/);
		return match ? match[1]! : "1.7";
	}

	/**
	 * Find all leaf page object numbers by following Root -> Pages -> Kids
	 */
	private findPageObjects(rootNum: number): number[] {
		const rootContent = extractObjectDictContent(
			this.pdfStr,
			rootNum,
			this.objIndex,
		);
		const pagesMatch = rootContent.match(/\/Pages\s+(\d+)\s+\d+\s+R/);
		if (!pagesMatch)
			throw new PDFParseError("Cannot find Pages ref in Root catalog");
		const pagesNum = parseInt(pagesMatch[1]!, 10);
		return this.collectPageLeafs(pagesNum, new Set());
	}

	/**
	 * Recursively collect leaf Page object numbers
	 */
	private collectPageLeafs(
		objNum: number,
		visited: Set<number>,
	): number[] {
		if (visited.has(objNum)) return [];
		visited.add(objNum);

		const content = extractObjectDictContent(
			this.pdfStr,
			objNum,
			this.objIndex,
		);

		const typeMatch = content.match(/\/Type\s+\/(\w+)/);
		if (typeMatch?.[1] === "Page") {
			return [objNum];
		}

		const kidsMatch = content.match(/\/Kids\s*\[([^\]]+)\]/);
		if (!kidsMatch) return [objNum];

		const refs: number[] = [];
		const refRegex = /(\d+)\s+\d+\s+R/g;
		let m: RegExpExecArray | null;
		while ((m = refRegex.exec(kidsMatch[1]!)) !== null) {
			refs.push(parseInt(m[1]!, 10));
		}

		const pages: number[] = [];
		for (const ref of refs) {
			pages.push(...this.collectPageLeafs(ref, visited));
		}
		return pages;
	}

	/**
	 * Parse a single page
	 */
	private parsePage(pageObjNum: number): ParsedPDFPage | null {
		try {
			const mediaBox = getMediaBox(this.pdfStr, pageObjNum, this.objIndex);
			const size = {
				width: mediaBox[2] - mediaBox[0],
				height: mediaBox[3] - mediaBox[1],
			};

			const pageContent = extractObjectDictContent(
				this.pdfStr,
				pageObjNum,
				this.objIndex,
			);

			// Extract text from content stream(s)
			let content = "";
			const contentsMatch = pageContent.match(
				/\/Contents\s+(\d+)\s+\d+\s+R/,
			);
			if (contentsMatch) {
				const contentsNum = parseInt(contentsMatch[1]!, 10);
				content = this.extractText(contentsNum);
			}

			return {
				ref: { objectNumber: pageObjNum, generation: 0 },
				size,
				content,
			};
		} catch {
			return null;
		}
	}

	/**
	 * Extract text from a content stream object, handling FlateDecode compression
	 */
	private extractText(objNum: number): string {
		const streamData = this.extractStreamData(objNum);
		if (!streamData) return "";

		return this.parseTextOperators(streamData);
	}

	/**
	 * Extract raw stream data from an object, decompressing if needed
	 */
	private extractStreamData(objNum: number): string | null {
		const pos = this.objIndex.get(objNum);
		if (pos === undefined) return null;

		// Find the dictionary and stream
		const dictStart = this.pdfStr.indexOf("<<", pos);
		if (dictStart === -1) return null;

		const dictEnd = this.findMatchingDictEnd(dictStart);
		if (dictEnd === -1) return null;

		const dictContent = this.pdfStr.slice(dictStart + 2, dictEnd);

		// Find "stream" keyword after the dict
		const afterDict = this.pdfStr.indexOf("stream", dictEnd);
		if (afterDict === -1) return null;

		// Stream data starts after "stream\n" or "stream\r\n"
		let streamStart = afterDict + 6; // "stream".length
		if (this.pdfStr[streamStart] === "\r") streamStart++;
		if (this.pdfStr[streamStart] === "\n") streamStart++;

		// Find endstream
		const endstream = this.pdfStr.indexOf("endstream", streamStart);
		if (endstream === -1) return null;

		// Trim trailing whitespace before endstream
		let streamEnd = endstream;
		while (
			streamEnd > streamStart &&
			(this.pdfStr[streamEnd - 1] === "\n" ||
				this.pdfStr[streamEnd - 1] === "\r")
		) {
			streamEnd--;
		}

		const isCompressed = /\/Filter\s*\/FlateDecode/.test(dictContent);

		if (isCompressed) {
			// Extract raw bytes from the latin1 string
			const rawBytes = new Uint8Array(streamEnd - streamStart);
			for (let i = 0; i < rawBytes.length; i++) {
				rawBytes[i] = this.pdfStr.charCodeAt(streamStart + i);
			}
			try {
				const decompressed = inflateSync(rawBytes);
				return new TextDecoder("latin1").decode(decompressed);
			} catch {
				return null;
			}
		}

		return this.pdfStr.slice(streamStart, streamEnd);
	}

	/**
	 * Find matching >> for a << at the given position
	 */
	private findMatchingDictEnd(startPos: number): number {
		let depth = 0;
		let i = startPos;
		while (i < this.pdfStr.length - 1) {
			if (this.pdfStr[i] === "(") {
				i++;
				while (i < this.pdfStr.length && this.pdfStr[i] !== ")") {
					if (this.pdfStr[i] === "\\") i++;
					i++;
				}
				i++;
			} else if (
				this.pdfStr[i] === "<" &&
				this.pdfStr[i + 1] === "<"
			) {
				depth++;
				i += 2;
			} else if (
				this.pdfStr[i] === ">" &&
				this.pdfStr[i + 1] === ">"
			) {
				depth--;
				if (depth === 0) return i;
				i += 2;
			} else {
				i++;
			}
		}
		return -1;
	}

	/**
	 * Parse text operators from content stream data
	 */
	private parseTextOperators(content: string): string {
		const texts: string[] = [];

		// Match (text) Tj — single string show
		const tjRegex = /\(([^)]*)\)\s*Tj/g;
		let match;
		while ((match = tjRegex.exec(content)) !== null) {
			texts.push(match[1]!);
		}

		// Match [...] TJ — array show (mix of strings and kerning numbers)
		const tjArrayRegex = /\[((?:[^[\]]*?))\]\s*TJ/gi;
		while ((match = tjArrayRegex.exec(content)) !== null) {
			const arrayContent = match[1]!;
			const stringParts: string[] = [];
			const partRegex = /\(([^)]*)\)/g;
			let partMatch;
			while ((partMatch = partRegex.exec(arrayContent)) !== null) {
				stringParts.push(partMatch[1]!);
			}
			if (stringParts.length > 0) {
				texts.push(stringParts.join(""));
			}
		}

		// Match ' and " operators (move to next line and show)
		const quoteRegex = /\(([^)]*)\)\s*['"]/g;
		while ((match = quoteRegex.exec(content)) !== null) {
			texts.push(match[1]!);
		}

		return texts.join(" ");
	}
}
