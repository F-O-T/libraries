/**
 * XML Parser — Converts an XML string into a DOM tree
 *
 * Supports:
 * - Full namespace support (prefixes, default namespaces, inheritance)
 * - XML declarations
 * - Elements, attributes, text, CDATA, comments, processing instructions
 * - Entity decoding (built-in + numeric character references)
 */

import { xmlParserOptionsSchema } from "./schemas.ts";
import type {
   XmlCData,
   XmlComment,
   XmlDocument,
   XmlElement,
   XmlParserOptions,
   XmlProcessingInstruction,
   XmlText,
} from "./types.ts";
import { XML_NODE_TYPES, XmlError } from "./types.ts";
import {
   decodeEntities,
   extractNamespaces,
   resolveNamespace,
   splitQName,
} from "./utils.ts";

// =============================================================================
// Parser State
// =============================================================================

interface ParserState {
   input: string;
   pos: number;
   line: number;
   column: number;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Parse an XML string into an XmlDocument
 *
 * @param xml - The XML string to parse
 * @param options - Parser options
 * @returns The parsed XmlDocument
 * @throws {XmlError} If the XML is malformed
 */
export function parseXml(xml: string, options?: XmlParserOptions): XmlDocument {
   const opts = xmlParserOptionsSchema.parse(options ?? {});
   const state: ParserState = { input: xml, pos: 0, line: 1, column: 1 };

   const doc: XmlDocument = {
      type: XML_NODE_TYPES.DOCUMENT,
      xmlVersion: null,
      encoding: null,
      standalone: null,
      children: [],
      root: null,
   };

   skipWhitespace(state);

   // Parse XML declaration if present
   if (lookAhead(state, "<?xml")) {
      parseXmlDeclaration(state, doc);
      skipWhitespace(state);
   }

   // Parse document content (comments, PIs, root element)
   while (state.pos < state.input.length) {
      skipWhitespace(state);
      if (state.pos >= state.input.length) break;

      if (lookAhead(state, "<!--")) {
         const comment = parseComment(state);
         if (opts.preserveComments) {
            comment.parent = doc;
            doc.children.push(comment);
         }
      } else if (lookAhead(state, "<?")) {
         const pi = parseProcessingInstruction(state);
         if (opts.preserveProcessingInstructions) {
            pi.parent = doc;
            doc.children.push(pi);
         }
      } else if (lookAhead(state, "<!DOCTYPE")) {
         skipDoctype(state);
      } else if (lookAhead(state, "<")) {
         const element = parseElement(state, opts, doc);
         doc.children.push(element);
         if (doc.root === null) {
            doc.root = element;
         }
      } else {
         error(state, `Unexpected character: '${state.input[state.pos]}'`);
      }
   }

   return doc;
}

// =============================================================================
// XML Declaration
// =============================================================================

function parseXmlDeclaration(state: ParserState, doc: XmlDocument): void {
   consume(state, "<?xml");
   requireWhitespace(state);

   // version is required
   consume(state, "version");
   skipWhitespace(state);
   consume(state, "=");
   skipWhitespace(state);
   doc.xmlVersion = parseQuotedValue(state);

   // encoding is optional
   const savedPos = state.pos;
   const savedLine = state.line;
   const savedCol = state.column;
   skipWhitespace(state);
   if (lookAhead(state, "encoding")) {
      consume(state, "encoding");
      skipWhitespace(state);
      consume(state, "=");
      skipWhitespace(state);
      doc.encoding = parseQuotedValue(state);
   } else {
      state.pos = savedPos;
      state.line = savedLine;
      state.column = savedCol;
   }

   // standalone is optional
   const savedPos2 = state.pos;
   const savedLine2 = state.line;
   const savedCol2 = state.column;
   skipWhitespace(state);
   if (lookAhead(state, "standalone")) {
      consume(state, "standalone");
      skipWhitespace(state);
      consume(state, "=");
      skipWhitespace(state);
      const val = parseQuotedValue(state);
      doc.standalone = val === "yes";
   } else {
      state.pos = savedPos2;
      state.line = savedLine2;
      state.column = savedCol2;
   }

   skipWhitespace(state);
   consume(state, "?>");
}

// =============================================================================
// Element Parsing
// =============================================================================

function parseElement(
   state: ParserState,
   opts: XmlParserOptions,
   parent: XmlElement | XmlDocument,
): XmlElement {
   consume(state, "<");
   const name = parseName(state);
   const { prefix, localName } = splitQName(name);

   // Parse attributes
   const rawAttrs: Array<{ name: string; value: string }> = [];
   while (true) {
      const ws = skipWhitespace(state);
      if (lookAhead(state, "/>") || lookAhead(state, ">")) break;
      if (!ws) {
         error(state, "Expected whitespace between attributes");
      }
      rawAttrs.push(parseAttribute(state));
   }

   // Separate namespace declarations from regular attributes
   const { namespaces, regularAttributes } = extractNamespaces(rawAttrs);

   // Create element
   const element: XmlElement = {
      type: XML_NODE_TYPES.ELEMENT,
      name,
      prefix,
      localName,
      namespaceUri: null,
      attributes: [],
      namespaces,
      children: [],
      parent,
   };

   // Resolve element namespace
   element.namespaceUri = resolveNamespace(prefix, element);

   // Resolve attribute namespaces
   for (const raw of regularAttributes) {
      const { prefix: attrPrefix, localName: attrLocalName } = splitQName(
         raw.name,
      );
      const namespaceUri = attrPrefix
         ? resolveNamespace(attrPrefix, element)
         : null;
      element.attributes.push({
         name: raw.name,
         value: decodeEntities(raw.value),
         prefix: attrPrefix,
         localName: attrLocalName,
         namespaceUri,
      });
   }

   // Self-closing element
   if (lookAhead(state, "/>")) {
      consume(state, "/>");
      return element;
   }

   consume(state, ">");

   // Parse children
   parseChildren(state, opts, element);

   // Parse closing tag
   consume(state, "</");
   const closingName = parseName(state);
   if (closingName !== name) {
      error(
         state,
         `Mismatched closing tag: expected </${name}>, got </${closingName}>`,
      );
   }
   skipWhitespace(state);
   consume(state, ">");

   return element;
}

function parseChildren(
   state: ParserState,
   opts: XmlParserOptions,
   parent: XmlElement,
): void {
   while (state.pos < state.input.length) {
      if (lookAhead(state, "</")) {
         return;
      }

      if (lookAhead(state, "<![CDATA[")) {
         const cdata = parseCData(state);
         if (opts.preserveCData) {
            cdata.parent = parent;
            parent.children.push(cdata);
         } else {
            // Convert CDATA to text
            const textNode: XmlText = {
               type: XML_NODE_TYPES.TEXT,
               value: cdata.value,
               parent,
            };
            parent.children.push(textNode);
         }
      } else if (lookAhead(state, "<!--")) {
         const comment = parseComment(state);
         if (opts.preserveComments) {
            comment.parent = parent;
            parent.children.push(comment);
         }
      } else if (lookAhead(state, "<?")) {
         const pi = parseProcessingInstruction(state);
         if (opts.preserveProcessingInstructions) {
            pi.parent = parent;
            parent.children.push(pi);
         }
      } else if (lookAhead(state, "<")) {
         const child = parseElement(state, opts, parent);
         parent.children.push(child);
      } else {
         const text = parseText(state);
         if (opts.preserveWhitespace || text.value.trim().length > 0) {
            text.parent = parent;
            parent.children.push(text);
         }
      }
   }
}

// =============================================================================
// Attribute Parsing
// =============================================================================

function parseAttribute(state: ParserState): {
   name: string;
   value: string;
} {
   const name = parseName(state);
   skipWhitespace(state);
   consume(state, "=");
   skipWhitespace(state);
   const value = parseQuotedValue(state);
   return { name, value };
}

// =============================================================================
// Text / CDATA / Comment / PI Parsing
// =============================================================================

function parseText(state: ParserState): XmlText {
   let value = "";
   while (state.pos < state.input.length && state.input[state.pos] !== "<") {
      value += state.input[state.pos];
      advance(state);
   }
   return {
      type: XML_NODE_TYPES.TEXT,
      value: decodeEntities(value),
      parent: null,
   };
}

function parseCData(state: ParserState): XmlCData {
   consume(state, "<![CDATA[");
   const endIdx = state.input.indexOf("]]>", state.pos);
   if (endIdx === -1) {
      error(state, "Unterminated CDATA section");
   }
   const value = state.input.slice(state.pos, endIdx);
   advanceBy(state, value.length);
   consume(state, "]]>");
   return {
      type: XML_NODE_TYPES.CDATA,
      value,
      parent: null,
   };
}

function parseComment(state: ParserState): XmlComment {
   consume(state, "<!--");
   const endIdx = state.input.indexOf("-->", state.pos);
   if (endIdx === -1) {
      error(state, "Unterminated comment");
   }
   const value = state.input.slice(state.pos, endIdx);
   advanceBy(state, value.length);
   consume(state, "-->");
   return {
      type: XML_NODE_TYPES.COMMENT,
      value,
      parent: null,
   };
}

function parseProcessingInstruction(
   state: ParserState,
): XmlProcessingInstruction {
   consume(state, "<?");
   const target = parseName(state);
   let data = "";
   if (
      state.pos < state.input.length &&
      isWhitespace(state.input[state.pos]!)
   ) {
      skipWhitespace(state);
      const endIdx = state.input.indexOf("?>", state.pos);
      if (endIdx === -1) {
         error(state, "Unterminated processing instruction");
      }
      data = state.input.slice(state.pos, endIdx);
      advanceBy(state, data.length);
   }
   consume(state, "?>");
   return {
      type: XML_NODE_TYPES.PROCESSING_INSTRUCTION,
      target,
      data,
      parent: null,
   };
}

// =============================================================================
// DOCTYPE Handling (skip, we don't build a DTD model)
// =============================================================================

function skipDoctype(state: ParserState): void {
   consume(state, "<!DOCTYPE");
   let depth = 1;
   while (state.pos < state.input.length && depth > 0) {
      const ch = state.input[state.pos]!;
      if (ch === "<") depth++;
      else if (ch === ">") depth--;
      advance(state);
   }
}

// =============================================================================
// Low-level Parsing Helpers
// =============================================================================

function parseName(state: ParserState): string {
   const start = state.pos;
   if (
      state.pos >= state.input.length ||
      !isNameStartChar(state.input[state.pos]!)
   ) {
      error(state, "Expected element or attribute name");
   }
   while (
      state.pos < state.input.length &&
      isNameChar(state.input[state.pos]!)
   ) {
      advance(state);
   }
   return state.input.slice(start, state.pos);
}

function parseQuotedValue(state: ParserState): string {
   const quote = state.input[state.pos];
   if (quote !== '"' && quote !== "'") {
      error(state, "Expected quoted value");
   }
   advance(state);
   let value = "";
   while (state.pos < state.input.length && state.input[state.pos] !== quote) {
      value += state.input[state.pos];
      advance(state);
   }
   if (state.pos >= state.input.length) {
      error(state, "Unterminated quoted value");
   }
   advance(state); // skip closing quote
   return decodeEntities(value);
}

function lookAhead(state: ParserState, str: string): boolean {
   return state.input.startsWith(str, state.pos);
}

function consume(state: ParserState, str: string): void {
   if (!state.input.startsWith(str, state.pos)) {
      error(
         state,
         `Expected '${str}', got '${state.input.slice(state.pos, state.pos + str.length)}'`,
      );
   }
   advanceBy(state, str.length);
}

function advance(state: ParserState): void {
   if (state.input[state.pos] === "\n") {
      state.line++;
      state.column = 1;
   } else {
      state.column++;
   }
   state.pos++;
}

function advanceBy(state: ParserState, count: number): void {
   for (let i = 0; i < count; i++) {
      advance(state);
   }
}

function skipWhitespace(state: ParserState): boolean {
   const start = state.pos;
   while (
      state.pos < state.input.length &&
      isWhitespace(state.input[state.pos]!)
   ) {
      advance(state);
   }
   return state.pos > start;
}

function requireWhitespace(state: ParserState): void {
   if (!skipWhitespace(state)) {
      error(state, "Expected whitespace");
   }
}

function isWhitespace(ch: string): boolean {
   return ch === " " || ch === "\t" || ch === "\n" || ch === "\r";
}

function isNameStartChar(ch: string): boolean {
   const c = ch.charCodeAt(0);
   return (
      ch === "_" ||
      ch === ":" ||
      (c >= 0x41 && c <= 0x5a) || // A-Z
      (c >= 0x61 && c <= 0x7a) || // a-z
      (c >= 0xc0 && c <= 0xd6) ||
      (c >= 0xd8 && c <= 0xf6) ||
      (c >= 0xf8 && c <= 0x2ff) ||
      (c >= 0x370 && c <= 0x37d) ||
      (c >= 0x37f && c <= 0x1fff) ||
      (c >= 0x200c && c <= 0x200d) ||
      (c >= 0x2070 && c <= 0x218f) ||
      (c >= 0x2c00 && c <= 0x2fef) ||
      (c >= 0x3001 && c <= 0xd7ff) ||
      (c >= 0xf900 && c <= 0xfdcf) ||
      (c >= 0xfdf0 && c <= 0xfffd)
   );
}

function isNameChar(ch: string): boolean {
   const c = ch.charCodeAt(0);
   return (
      isNameStartChar(ch) ||
      ch === "-" ||
      ch === "." ||
      (c >= 0x30 && c <= 0x39) || // 0-9
      c === 0xb7 ||
      (c >= 0x300 && c <= 0x36f) ||
      (c >= 0x203f && c <= 0x2040)
   );
}

function error(state: ParserState, message: string): never {
   throw new XmlError(message, state.line, state.column, state.pos);
}
