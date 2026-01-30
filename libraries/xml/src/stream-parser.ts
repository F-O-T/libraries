/**
 * SAX-like Streaming XML Parser
 *
 * Event-driven parser for processing large XML documents without
 * building a full DOM tree in memory. Fires callbacks for each
 * XML construct encountered.
 */

import type {
   StreamParserCallbacks,
   XmlAttribute,
   XmlNamespace,
} from "./types.ts";
import { XmlError } from "./types.ts";
import { decodeEntities, extractNamespaces, splitQName } from "./utils.ts";

// =============================================================================
// Public API
// =============================================================================

/**
 * Parse an XML string using SAX-like streaming callbacks
 *
 * @param xml - The XML string to parse
 * @param callbacks - Event callbacks
 * @throws {XmlError} If the XML is malformed (unless onError callback handles it)
 */
export function streamParseXml(
   xml: string,
   callbacks: StreamParserCallbacks,
): void {
   const state: StreamState = {
      input: xml,
      pos: 0,
      line: 1,
      column: 1,
      callbacks,
      namespaceStack: [],
   };

   try {
      callbacks.onDocumentStart?.();
      skipWhitespace(state);

      // XML declaration
      if (lookAhead(state, "<?xml")) {
         parseXmlDeclaration(state);
         skipWhitespace(state);
      }

      // Document content
      while (state.pos < state.input.length) {
         skipWhitespace(state);
         if (state.pos >= state.input.length) break;

         if (lookAhead(state, "<!--")) {
            parseComment(state);
         } else if (lookAhead(state, "<?")) {
            parseProcessingInstruction(state);
         } else if (lookAhead(state, "<!DOCTYPE")) {
            skipDoctype(state);
         } else if (lookAhead(state, "<")) {
            parseElement(state);
         } else {
            streamError(
               state,
               `Unexpected character: '${state.input[state.pos]}'`,
            );
         }
      }

      callbacks.onDocumentEnd?.();
   } catch (e) {
      if (e instanceof XmlError && callbacks.onError) {
         callbacks.onError(e);
      } else {
         throw e;
      }
   }
}

// =============================================================================
// Internal State
// =============================================================================

interface StreamState {
   input: string;
   pos: number;
   line: number;
   column: number;
   callbacks: StreamParserCallbacks;
   namespaceStack: XmlNamespace[][];
}

// =============================================================================
// Element Parsing
// =============================================================================

function parseElement(state: StreamState): void {
   consume(state, "<");
   const name = parseName(state);
   const { prefix, localName } = splitQName(name);

   // Parse attributes
   const rawAttrs: Array<{ name: string; value: string }> = [];
   while (true) {
      const ws = skipWhitespace(state);
      if (lookAhead(state, "/>") || lookAhead(state, ">")) break;
      if (!ws) {
         streamError(state, "Expected whitespace between attributes");
      }
      rawAttrs.push(parseAttribute(state));
   }

   const { namespaces, regularAttributes } = extractNamespaces(rawAttrs);

   // Push namespace scope
   state.namespaceStack.push(namespaces);

   // Resolve namespace
   const namespaceUri = resolveNsFromStack(prefix, state.namespaceStack);

   // Build resolved attributes
   const attributes: XmlAttribute[] = regularAttributes.map((raw) => {
      const { prefix: ap, localName: al } = splitQName(raw.name);
      return {
         name: raw.name,
         value: decodeEntities(raw.value),
         prefix: ap,
         localName: al,
         namespaceUri: ap ? resolveNsFromStack(ap, state.namespaceStack) : null,
      };
   });

   const selfClosing = lookAhead(state, "/>");

   state.callbacks.onElementStart?.(
      name,
      attributes,
      namespaces,
      prefix,
      localName,
      namespaceUri,
   );

   if (selfClosing) {
      consume(state, "/>");
      state.callbacks.onElementEnd?.(name, prefix, localName, namespaceUri);
      state.namespaceStack.pop();
      return;
   }

   consume(state, ">");

   // Parse children
   while (state.pos < state.input.length) {
      if (lookAhead(state, "</")) {
         break;
      }

      if (lookAhead(state, "<![CDATA[")) {
         parseCData(state);
      } else if (lookAhead(state, "<!--")) {
         parseComment(state);
      } else if (lookAhead(state, "<?")) {
         parseProcessingInstruction(state);
      } else if (lookAhead(state, "<")) {
         parseElement(state);
      } else {
         parseText(state);
      }
   }

   // Closing tag
   consume(state, "</");
   const closingName = parseName(state);
   if (closingName !== name) {
      streamError(
         state,
         `Mismatched closing tag: expected </${name}>, got </${closingName}>`,
      );
   }
   skipWhitespace(state);
   consume(state, ">");

   state.callbacks.onElementEnd?.(name, prefix, localName, namespaceUri);
   state.namespaceStack.pop();
}

// =============================================================================
// XML Declaration
// =============================================================================

function parseXmlDeclaration(state: StreamState): void {
   consume(state, "<?xml");
   requireWhitespace(state);

   consume(state, "version");
   skipWhitespace(state);
   consume(state, "=");
   skipWhitespace(state);
   const version = parseQuotedValue(state);

   let encoding: string | null = null;
   let standalone: boolean | null = null;

   const sp1 = state.pos;
   const sl1 = state.line;
   const sc1 = state.column;
   skipWhitespace(state);
   if (lookAhead(state, "encoding")) {
      consume(state, "encoding");
      skipWhitespace(state);
      consume(state, "=");
      skipWhitespace(state);
      encoding = parseQuotedValue(state);
   } else {
      state.pos = sp1;
      state.line = sl1;
      state.column = sc1;
   }

   const sp2 = state.pos;
   const sl2 = state.line;
   const sc2 = state.column;
   skipWhitespace(state);
   if (lookAhead(state, "standalone")) {
      consume(state, "standalone");
      skipWhitespace(state);
      consume(state, "=");
      skipWhitespace(state);
      standalone = parseQuotedValue(state) === "yes";
   } else {
      state.pos = sp2;
      state.line = sl2;
      state.column = sc2;
   }

   skipWhitespace(state);
   consume(state, "?>");

   state.callbacks.onXmlDeclaration?.(version, encoding, standalone);
}

// =============================================================================
// Content Parsing
// =============================================================================

function parseText(state: StreamState): void {
   let value = "";
   while (state.pos < state.input.length && state.input[state.pos] !== "<") {
      value += state.input[state.pos];
      advance(state);
   }
   state.callbacks.onText?.(decodeEntities(value));
}

function parseCData(state: StreamState): void {
   consume(state, "<![CDATA[");
   const endIdx = state.input.indexOf("]]>", state.pos);
   if (endIdx === -1) {
      streamError(state, "Unterminated CDATA section");
   }
   const value = state.input.slice(state.pos, endIdx);
   advanceBy(state, value.length);
   consume(state, "]]>");
   state.callbacks.onCData?.(value);
}

function parseComment(state: StreamState): void {
   consume(state, "<!--");
   const endIdx = state.input.indexOf("-->", state.pos);
   if (endIdx === -1) {
      streamError(state, "Unterminated comment");
   }
   const value = state.input.slice(state.pos, endIdx);
   advanceBy(state, value.length);
   consume(state, "-->");
   state.callbacks.onComment?.(value);
}

function parseProcessingInstruction(state: StreamState): void {
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
         streamError(state, "Unterminated processing instruction");
      }
      data = state.input.slice(state.pos, endIdx);
      advanceBy(state, data.length);
   }
   consume(state, "?>");
   state.callbacks.onProcessingInstruction?.(target, data);
}

function skipDoctype(state: StreamState): void {
   consume(state, "<!DOCTYPE");
   let depth = 1;
   while (state.pos < state.input.length && depth > 0) {
      const ch = state.input[state.pos]!;
      if (ch === "<") depth++;
      else if (ch === ">") depth--;
      advance(state);
   }
}

function parseAttribute(state: StreamState): {
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
// Namespace Resolution
// =============================================================================

function resolveNsFromStack(
   prefix: string | null,
   stack: XmlNamespace[][],
): string | null {
   if (prefix === "xml") return "http://www.w3.org/XML/1998/namespace";
   if (prefix === "xmlns") return "http://www.w3.org/2000/xmlns/";

   for (let i = stack.length - 1; i >= 0; i--) {
      for (const ns of stack[i]!) {
         if (ns.prefix === prefix) return ns.uri;
      }
   }
   return null;
}

// =============================================================================
// Low-level Helpers
// =============================================================================

function parseName(state: StreamState): string {
   const start = state.pos;
   if (
      state.pos >= state.input.length ||
      !isNameStartChar(state.input[state.pos]!)
   ) {
      streamError(state, "Expected name");
   }
   while (
      state.pos < state.input.length &&
      isNameChar(state.input[state.pos]!)
   ) {
      advance(state);
   }
   return state.input.slice(start, state.pos);
}

function parseQuotedValue(state: StreamState): string {
   const quote = state.input[state.pos];
   if (quote !== '"' && quote !== "'") {
      streamError(state, "Expected quoted value");
   }
   advance(state);
   let value = "";
   while (state.pos < state.input.length && state.input[state.pos] !== quote) {
      value += state.input[state.pos];
      advance(state);
   }
   if (state.pos >= state.input.length) {
      streamError(state, "Unterminated quoted value");
   }
   advance(state);
   return decodeEntities(value);
}

function lookAhead(state: StreamState, str: string): boolean {
   return state.input.startsWith(str, state.pos);
}

function consume(state: StreamState, str: string): void {
   if (!state.input.startsWith(str, state.pos)) {
      streamError(
         state,
         `Expected '${str}', got '${state.input.slice(state.pos, state.pos + str.length)}'`,
      );
   }
   advanceBy(state, str.length);
}

function advance(state: StreamState): void {
   if (state.input[state.pos] === "\n") {
      state.line++;
      state.column = 1;
   } else {
      state.column++;
   }
   state.pos++;
}

function advanceBy(state: StreamState, count: number): void {
   for (let i = 0; i < count; i++) {
      advance(state);
   }
}

function skipWhitespace(state: StreamState): boolean {
   const start = state.pos;
   while (
      state.pos < state.input.length &&
      isWhitespace(state.input[state.pos]!)
   ) {
      advance(state);
   }
   return state.pos > start;
}

function requireWhitespace(state: StreamState): void {
   if (!skipWhitespace(state)) {
      streamError(state, "Expected whitespace");
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
      (c >= 0x41 && c <= 0x5a) ||
      (c >= 0x61 && c <= 0x7a) ||
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
      (c >= 0x30 && c <= 0x39) ||
      c === 0xb7 ||
      (c >= 0x300 && c <= 0x36f) ||
      (c >= 0x203f && c <= 0x2040)
   );
}

function streamError(state: StreamState, message: string): never {
   throw new XmlError(message, state.line, state.column, state.pos);
}
