/**
 * XML Serializer — Converts a DOM tree back to an XML string
 *
 * Supports:
 * - Pretty printing with configurable indentation
 * - XML declaration output
 * - Self-closing empty elements
 * - Proper entity encoding
 * - Namespace declaration output
 */

import { xmlSerializerOptionsSchema } from "./schemas.ts";
import type {
   XmlDocument,
   XmlElement,
   XmlNode,
   XmlSerializerOptions,
} from "./types.ts";
import { XML_NODE_TYPES } from "./types.ts";
import { encodeAttribute, encodeText } from "./utils.ts";

/** Resolved options after Zod defaults are applied */
type ResolvedSerializerOptions = Required<XmlSerializerOptions>;

// =============================================================================
// Public API
// =============================================================================

/**
 * Serialize an XmlDocument or XmlElement to an XML string
 *
 * @param node - The document or element to serialize
 * @param options - Serialization options
 * @returns The XML string
 */
export function serializeXml(
   node: XmlDocument | XmlElement,
   options?: XmlSerializerOptions,
): string {
   const opts = xmlSerializerOptionsSchema.parse(
      options ?? {},
   ) as ResolvedSerializerOptions;
   const parts: string[] = [];

   if (node.type === XML_NODE_TYPES.DOCUMENT) {
      serializeDocument(node, opts, parts);
   } else {
      serializeElement(node, opts, parts, 0);
   }

   return parts.join("");
}

// =============================================================================
// Document Serialization
// =============================================================================

function serializeDocument(
   doc: XmlDocument,
   opts: ResolvedSerializerOptions,
   parts: string[],
): void {
   if (opts.declaration && doc.xmlVersion) {
      parts.push("<?xml");
      parts.push(` version="${doc.xmlVersion}"`);
      if (doc.encoding) {
         parts.push(` encoding="${doc.encoding}"`);
      }
      if (doc.standalone !== null) {
         parts.push(` standalone="${doc.standalone ? "yes" : "no"}"`);
      }
      parts.push("?>");
      if (opts.indent) {
         parts.push(opts.newline);
      }
   }

   for (let i = 0; i < doc.children.length; i++) {
      serializeNode(doc.children[i]!, opts, parts, 0);
      if (opts.indent && i < doc.children.length - 1) {
         parts.push(opts.newline);
      }
   }
}

// =============================================================================
// Node Serialization
// =============================================================================

function serializeNode(
   node: XmlNode,
   opts: ResolvedSerializerOptions,
   parts: string[],
   depth: number,
): void {
   switch (node.type) {
      case XML_NODE_TYPES.ELEMENT:
         serializeElement(node, opts, parts, depth);
         break;
      case XML_NODE_TYPES.TEXT:
         parts.push(encodeText(node.value));
         break;
      case XML_NODE_TYPES.CDATA:
         parts.push(`<![CDATA[${node.value}]]>`);
         break;
      case XML_NODE_TYPES.COMMENT:
         if (opts.indent) parts.push(getIndent(opts, depth));
         parts.push(`<!--${node.value}-->`);
         break;
      case XML_NODE_TYPES.PROCESSING_INSTRUCTION:
         if (opts.indent) parts.push(getIndent(opts, depth));
         if (node.data) {
            parts.push(`<?${node.target} ${node.data}?>`);
         } else {
            parts.push(`<?${node.target}?>`);
         }
         break;
   }
}

function serializeElement(
   element: XmlElement,
   opts: ResolvedSerializerOptions,
   parts: string[],
   depth: number,
): void {
   if (opts.indent && depth > 0) {
      parts.push(getIndent(opts, depth));
   }

   parts.push(`<${element.name}`);

   // Namespace declarations
   for (const ns of element.namespaces) {
      if (ns.prefix) {
         parts.push(` xmlns:${ns.prefix}="${encodeAttribute(ns.uri)}"`);
      } else {
         parts.push(` xmlns="${encodeAttribute(ns.uri)}"`);
      }
   }

   // Attributes
   for (const attr of element.attributes) {
      parts.push(` ${attr.name}="${encodeAttribute(attr.value)}"`);
   }

   // Self-closing or children
   if (element.children.length === 0 && opts.selfClose) {
      parts.push("/>");
      return;
   }

   parts.push(">");

   const hasElementChildren = element.children.some(
      (c) =>
         c.type === XML_NODE_TYPES.ELEMENT ||
         c.type === XML_NODE_TYPES.COMMENT ||
         c.type === XML_NODE_TYPES.PROCESSING_INSTRUCTION,
   );

   const hasOnlyTextChildren = element.children.every(
      (c) => c.type === XML_NODE_TYPES.TEXT || c.type === XML_NODE_TYPES.CDATA,
   );

   if (hasElementChildren && opts.indent) {
      for (const child of element.children) {
         parts.push(opts.newline);
         serializeNode(child, opts, parts, depth + 1);
      }
      parts.push(opts.newline);
      parts.push(getIndent(opts, depth));
   } else if (hasOnlyTextChildren) {
      // Inline text content
      for (const child of element.children) {
         serializeNode(child, opts, parts, depth + 1);
      }
   } else {
      for (const child of element.children) {
         serializeNode(child, opts, parts, depth + 1);
      }
   }

   parts.push(`</${element.name}>`);
}

// =============================================================================
// Helpers
// =============================================================================

function getIndent(opts: XmlSerializerOptions, depth: number): string {
   if (!opts.indent) return "";
   return opts.indent.repeat(depth);
}
