/**
 * Lightweight PDF structure parser for incremental editing
 *
 * Parses just enough of an existing PDF to enable incremental updates:
 * - Finds the cross-reference table via startxref
 * - Reads the trailer to get Root, Size, Info
 * - Follows Root -> Pages -> Kids to locate page objects
 * - Extracts MediaBox dimensions from pages
 *
 * All public functions accept a pre-decoded latin1 string (`pdfStr`) rather
 * than the raw Uint8Array so that the caller can decode ONCE and reuse the
 * string across many calls — avoiding O(pages) redundant allocations.
 */

/**
 * Parsed PDF structure needed for incremental updates
 */
export type PdfStructure = {
	xrefOffset: number;
	rootNum: number;
	infoNum: number | null;
	size: number;
	pagesNum: number;
	pageNums: number[];
	rootDictContent: string;
	pageDictContents: string[];
};

/**
 * Find the byte offset recorded after the last `startxref` keyword
 */
export function findStartXref(pdfStr: string): number {
	const idx = pdfStr.lastIndexOf("startxref");
	if (idx === -1) throw new Error("Cannot find startxref in PDF");
	const after = pdfStr.slice(idx + 9).trim().split(/[\r\n\s]/)[0];
	return parseInt(after!, 10);
}

/**
 * Parse the trailer dictionary to extract Root, Size, Info, and Prev xref offset.
 *
 * Supports both traditional trailers (`trailer << ... >>`) and
 * cross-reference streams (PDF 1.5+) where the trailer entries live
 * inside the xref stream object dictionary.
 */
export function parseTrailer(pdfStr: string): {
	root: number;
	size: number;
	info: number | null;
	prevXref: number;
} {
	const startxrefIdx = pdfStr.lastIndexOf("startxref");

	// Try traditional trailer first
	const trailerIdx = pdfStr.lastIndexOf("trailer");

	let dictStr: string;

	if (trailerIdx !== -1 && trailerIdx < startxrefIdx) {
		// Traditional trailer
		dictStr = pdfStr.slice(trailerIdx, startxrefIdx);
	} else {
		// Cross-reference stream (PDF 1.5+): startxref points to an object
		// whose dictionary contains the trailer entries (Root, Size, Info, etc.)
		const xrefOffset = findStartXref(pdfStr);
		const xrefObjStr = pdfStr.slice(xrefOffset, xrefOffset + 4096);
		const dictStart = xrefObjStr.indexOf("<<");
		if (dictStart === -1) {
			throw new Error("Cannot find trailer or xref stream dictionary in PDF");
		}
		const dictEnd = findMatchingDictEnd(xrefObjStr, dictStart);
		if (dictEnd === -1) {
			throw new Error("Cannot find end of xref stream dictionary");
		}
		dictStr = xrefObjStr.slice(dictStart, dictEnd + 2);
	}

	const rootMatch = dictStr.match(/\/Root\s+(\d+)\s+\d+\s+R/);
	if (!rootMatch) throw new Error("Cannot find Root ref in trailer");

	const sizeMatch = dictStr.match(/\/Size\s+(\d+)/);
	if (!sizeMatch) throw new Error("Cannot find Size in trailer");

	const infoMatch = dictStr.match(/\/Info\s+(\d+)\s+\d+\s+R/);
	const prevMatch = dictStr.match(/\/Prev\s+(\d+)/);

	return {
		root: parseInt(rootMatch[1]!, 10),
		size: parseInt(sizeMatch[1]!, 10),
		info: infoMatch ? parseInt(infoMatch[1]!, 10) : null,
		prevXref: prevMatch ? parseInt(prevMatch[1]!, 10) : findStartXref(pdfStr),
	};
}

/**
 * Extract the dictionary content (between outer << and >>) for a given object number.
 * Returns the content string without the delimiters.
 */
export function extractObjectDictContent(
	pdfStr: string,
	objNum: number,
): string {
	const objRegex = new RegExp(`(?:^|\\s)${objNum}\\s+0\\s+obj`, "m");
	const match = pdfStr.match(objRegex);
	if (!match || match.index === undefined) {
		throw new Error(`Cannot find object ${objNum} in PDF`);
	}

	const searchStart = match.index + match[0].length;
	const dictStart = pdfStr.indexOf("<<", searchStart);
	if (dictStart === -1 || dictStart > searchStart + 200) {
		throw new Error(`Cannot find dictionary start for object ${objNum}`);
	}

	const dictEnd = findMatchingDictEnd(pdfStr, dictStart);
	if (dictEnd === -1) {
		throw new Error(`Cannot find dictionary end for object ${objNum}`);
	}

	return pdfStr.slice(dictStart + 2, dictEnd);
}

/**
 * Find all LEAF page object numbers by following Root -> Pages -> Kids recursively.
 *
 * The PDF page tree can be arbitrarily deep — every ~100-200 pages, PDF tools
 * create intermediate Pages nodes (Type=Pages) that group their children.
 * This function recurses until it reaches actual Page leaves (Type=Page).
 */
export function findPageObjects(pdfStr: string, rootNum: number): number[] {
	const rootContent = extractObjectDictContent(pdfStr, rootNum);
	const pagesMatch = rootContent.match(/\/Pages\s+(\d+)\s+\d+\s+R/);
	if (!pagesMatch) throw new Error("Cannot find Pages ref in Root catalog");
	const pagesNum = parseInt(pagesMatch[1]!, 10);

	return collectPageLeafs(pdfStr, pagesNum, new Set());
}

/**
 * Recursively collect leaf Page object numbers from a page tree node.
 * Handles both flat trees (all Kids are Pages) and nested trees
 * (intermediate Pages nodes with their own Kids arrays).
 */
function collectPageLeafs(
	pdfStr: string,
	objNum: number,
	visited: Set<number>,
): number[] {
	if (visited.has(objNum)) return []; // guard against malformed circular refs
	visited.add(objNum);

	const content = extractObjectDictContent(pdfStr, objNum);

	// Distinguish leaf Page from intermediate Pages node via /Type
	const typeMatch = content.match(/\/Type\s+\/(\w+)/);
	if (typeMatch?.[1] === "Page") {
		return [objNum];
	}

	// Intermediate Pages node — recurse into each kid
	const kidsMatch = content.match(/\/Kids\s*\[([^\]]+)\]/);
	if (!kidsMatch) {
		// Malformed node: no Kids and not a leaf — treat as single page (best effort)
		return [objNum];
	}

	const refs: number[] = [];
	const refRegex = /(\d+)\s+\d+\s+R/g;
	let m: RegExpExecArray | null;
	while ((m = refRegex.exec(kidsMatch[1]!)) !== null) {
		refs.push(parseInt(m[1]!, 10));
	}

	const pages: number[] = [];
	for (const ref of refs) {
		pages.push(...collectPageLeafs(pdfStr, ref, visited));
	}
	return pages;
}

/**
 * Get the MediaBox for a page object: [x1, y1, x2, y2].
 *
 * Per the PDF spec, /MediaBox is inherited: if the Page object itself does not
 * carry the entry, we walk up the /Parent chain until we find one.
 */
export function getMediaBox(
	pdfStr: string,
	pageObjNum: number,
): [number, number, number, number] {
	const visited = new Set<number>(); // guard against malformed circular refs
	let objNum: number | null = pageObjNum;

	while (objNum !== null && !visited.has(objNum)) {
		visited.add(objNum);
		const content = extractObjectDictContent(pdfStr, objNum);

		const mediaBoxMatch = content.match(
			/\/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/,
		);
		if (mediaBoxMatch) {
			return [
				parseFloat(mediaBoxMatch[1]!),
				parseFloat(mediaBoxMatch[2]!),
				parseFloat(mediaBoxMatch[3]!),
				parseFloat(mediaBoxMatch[4]!),
			];
		}

		// Walk up the parent chain
		const parentMatch = content.match(/\/Parent\s+(\d+)\s+\d+\s+R/);
		objNum = parentMatch ? parseInt(parentMatch[1]!, 10) : null;
	}

	throw new Error(`Cannot find MediaBox for page object ${pageObjNum}`);
}

/**
 * Parse the full PDF structure needed for incremental editing.
 *
 * @param pdfStr - The PDF file decoded as a latin1 string (decode ONCE and pass here)
 */
export function parsePdfStructure(pdfStr: string): PdfStructure {
	const xrefOffset = findStartXref(pdfStr);
	const trailer = parseTrailer(pdfStr);

	const rootContent = extractObjectDictContent(pdfStr, trailer.root);
	const pagesMatch = rootContent.match(/\/Pages\s+(\d+)\s+\d+\s+R/);
	if (!pagesMatch) throw new Error("Cannot find Pages ref in Root catalog");
	const pagesNum = parseInt(pagesMatch[1]!, 10);

	const pageNums = findPageObjects(pdfStr, trailer.root);
	const pageDictContents = pageNums.map((pn) =>
		extractObjectDictContent(pdfStr, pn),
	);

	return {
		xrefOffset,
		rootNum: trailer.root,
		infoNum: trailer.info,
		size: trailer.size,
		pagesNum,
		pageNums,
		rootDictContent: rootContent,
		pageDictContents,
	};
}

/**
 * Find the position of the >> that closes the dictionary starting at startPos.
 * Handles nested << >> and skips PDF string literals in parentheses.
 */
function findMatchingDictEnd(str: string, startPos: number): number {
	let depth = 0;
	let i = startPos;

	while (i < str.length - 1) {
		if (str[i] === "(") {
			// skip parenthesized string
			i++;
			while (i < str.length && str[i] !== ")") {
				if (str[i] === "\\") i++;
				i++;
			}
			i++; // skip ')'
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

/**
 * Find the position of the ] that closes the array starting at startPos.
 * Handles nested [ ] and skips PDF string literals in parentheses.
 */
function findMatchingArrayEnd(str: string, startPos: number): number {
	let depth = 0;
	let i = startPos;

	while (i < str.length) {
		if (str[i] === "(") {
			// skip parenthesized string
			i++;
			while (i < str.length && str[i] !== ")") {
				if (str[i] === "\\") i++;
				i++;
			}
			i++; // skip ')'
		} else if (str[i] === "[") {
			depth++;
			i++;
		} else if (str[i] === "]") {
			depth--;
			if (depth === 0) return i;
			i++;
		} else {
			i++;
		}
	}

	return -1;
}

/**
 * Parse a Resources dictionary from page content, handling both inline
 * dictionaries and indirect references.
 *
 * Returns a map of resource type names to their dictionary/array content strings.
 * Example: { "/Font": "<< /F1 10 0 R >>", "/ProcSet": "[/PDF /Text]" }
 */
export function parseResourcesDict(
	pageContent: string,
	pdfStr: string,
): Record<string, string> {
	const result: Record<string, string> = {};

	// Check for inline Resources dictionary
	const inlineMatch = pageContent.match(/\/Resources\s*<</);
	if (inlineMatch) {
		const resIdx = pageContent.indexOf("/Resources");
		const resStart = pageContent.indexOf("<<", resIdx);
		const resEnd = findMatchingDictEnd(pageContent, resStart);

		if (resEnd === -1) {
			throw new Error("Cannot find end of Resources dictionary");
		}

		const resContent = pageContent.slice(resStart + 2, resEnd);
		return parseResourceEntries(resContent);
	}

	// Check for indirect Resources reference
	const refMatch = pageContent.match(/\/Resources\s+(\d+)\s+\d+\s+R/);
	if (refMatch) {
		const objNum = parseInt(refMatch[1]!, 10);
		const objContent = extractObjectDictContent(pdfStr, objNum);
		return parseResourceEntries(objContent);
	}

	// No Resources found
	return result;
}

/**
 * Merge two Resources dictionaries, combining entries from both.
 *
 * For dictionary-type entries like /Font, /XObject, extracts individual
 * name-reference pairs and combines them. For array-type entries like
 * /ProcSet, uses the existing value (no merge needed).
 *
 * @param existing - Parsed Resources from original page
 * @param additions - New Resources to add (from signature appearance)
 * @returns Merged Resources dictionary entries
 */
export function mergeResourcesDicts(
	existing: Record<string, string>,
	additions: Record<string, string>,
): Record<string, string> {
	const result = { ...existing };

	for (const [resType, addValue] of Object.entries(additions)) {
		if (!result[resType]) {
			// No existing entry for this type, just add it
			result[resType] = addValue;
			continue;
		}

		const existingValue = result[resType]!;

		// Arrays (like /ProcSet) - keep existing, don't merge
		if (existingValue.startsWith("[")) {
			continue;
		}

		// Dictionaries - merge entries
		if (existingValue.startsWith("<<")) {
			result[resType] = mergeDictEntries(existingValue, addValue);
		} else {
			throw new Error(`Unexpected resource format for ${resType}: ${existingValue}`);
		}
	}

	return result;
}

/**
 * Merge two PDF dictionary strings by combining their name-reference pairs.
 *
 * Example:
 *   existing: "<< /F1 10 0 R /F2 11 0 R >>"
 *   additions: "<< /SigF1 20 0 R >>"
 *   result: "<< /F1 10 0 R /F2 11 0 R /SigF1 20 0 R >>"
 */
function mergeDictEntries(existing: string, additions: string): string {
	// Extract entries from both dictionaries
	const existingEntries = extractDictEntries(existing);
	const additionEntries = extractDictEntries(additions);

	// Combine (additions override existing if same key)
	const merged = { ...existingEntries, ...additionEntries };

	// Rebuild dictionary string
	const entries = Object.entries(merged)
		.map(([name, ref]) => `${name} ${ref}`)
		.join(" ");

	return `<< ${entries} >>`;
}

/**
 * Extract name-reference pairs from a PDF dictionary string.
 *
 * Example: "<< /F1 10 0 R /F2 11 0 R >>"
 * Returns: { "/F1": "10 0 R", "/F2": "11 0 R" }
 */
function extractDictEntries(dict: string): Record<string, string> {
	const entries: Record<string, string> = {};

	// Remove outer << >>
	const inner = dict.replace(/^<<\s*/, "").replace(/\s*>>$/, "");

	// Match /Name objNum gen R patterns
	// Pattern matches PDF names with hyphens, dots, and hex-encoded characters
	const regex = /(\/[^\s<>\[\]()\/]+)\s+(\d+\s+\d+\s+R)/g;
	let match: RegExpExecArray | null;

	while ((match = regex.exec(inner)) !== null) {
		entries[match[1]!] = match[2]!;
	}

	return entries;
}

/**
 * Parse individual resource entries from a Resources dictionary content string.
 *
 * Extracts top-level entries like /Font, /XObject, /ExtGState, etc.
 */
function parseResourceEntries(content: string): Record<string, string> {
	const result: Record<string, string> = {};

	// Resource entry names to extract
	const resourceTypes = [
		"/Font",
		"/XObject",
		"/ExtGState",
		"/ColorSpace",
		"/Pattern",
		"/Shading",
		"/ProcSet",
	];

	for (const resType of resourceTypes) {
		// Use regex to match resource type at dictionary level (not nested inside values)
		// Pattern: /ResourceType followed by whitespace and then either << or [
		const pattern = new RegExp(
			`${resType.replace(/\//g, "\\/")}\\s+([<\\[])`
		);
		const match = content.match(pattern);

		if (!match) continue;

		const idx = match.index!;

		// Find the value (either << dict >> or [ array ])
		let valueStart = idx + resType.length;
		while (valueStart < content.length && /\s/.test(content[valueStart]!)) {
			valueStart++;
		}

		if (content[valueStart] === "<" && content[valueStart + 1] === "<") {
			// Dictionary value
			const dictEnd = findMatchingDictEnd(content, valueStart);
			if (dictEnd === -1) {
				throw new Error(
					`Cannot find end of ${resType} dictionary`
				);
			}
			result[resType] = content.slice(valueStart, dictEnd + 2);
		} else if (content[valueStart] === "[") {
			// Array value
			const arrayEnd = findMatchingArrayEnd(content, valueStart);
			if (arrayEnd === -1) {
				throw new Error(
					`Cannot find end of ${resType} array`
				);
			}
			result[resType] = content.slice(valueStart, arrayEnd + 1);
		}
	}

	return result;
}
