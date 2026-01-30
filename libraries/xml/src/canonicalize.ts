/**
 * W3C Exclusive XML Canonicalization 1.0 (C14N)
 *
 * Implements the Exclusive XML Canonicalization algorithm as specified in:
 * https://www.w3.org/TR/xml-exc-c14n/
 *
 * Key rules:
 * - UTF-8 encoding
 * - No XML declaration
 * - Attribute values normalized (double-quoted, entities encoded)
 * - Namespace declarations sorted and output only when visibly utilized
 * - Attributes sorted by namespace URI then local name
 * - Empty elements use start-tag + end-tag (no self-closing)
 * - Whitespace in text preserved exactly
 * - Comments excluded by default (configurable)
 * - Line endings normalized to #xA (\n)
 */

import { c14nOptionsSchema } from "./schemas.ts";
import type {
   C14NOptions,
   XmlElement,
   XmlNamespace,
   XmlNode,
} from "./types.ts";
import { XML_NODE_TYPES } from "./types.ts";

// =============================================================================
// Public API
// =============================================================================

/**
 * Canonicalize an XML element using W3C Exclusive C14N
 *
 * @param element - The element to canonicalize
 * @param options - Canonicalization options
 * @returns The canonical XML string
 */
export function canonicalize(
   element: XmlElement,
   options?: C14NOptions,
): string {
   const opts = c14nOptionsSchema.parse(options ?? {});
   const renderedNs = new Set<string>();
   return canonicalizeNode(element, opts, renderedNs);
}

// =============================================================================
// Canonicalization Implementation
// =============================================================================

function canonicalizeNode(
   node: XmlNode,
   opts: C14NOptions,
   parentRenderedNs: Set<string>,
): string {
   switch (node.type) {
      case XML_NODE_TYPES.ELEMENT:
         return canonicalizeElement(node, opts, parentRenderedNs);
      case XML_NODE_TYPES.TEXT:
         return canonicalizeText(node.value);
      case XML_NODE_TYPES.CDATA:
         // C14N replaces CDATA with text content
         return canonicalizeText(node.value);
      case XML_NODE_TYPES.COMMENT:
         if (opts.withComments) {
            return `<!--${node.value}-->`;
         }
         return "";
      case XML_NODE_TYPES.PROCESSING_INSTRUCTION:
         if (node.data) {
            return `<?${node.target} ${node.data}?>`;
         }
         return `<?${node.target}?>`;
   }
}

function canonicalizeElement(
   element: XmlElement,
   opts: C14NOptions,
   parentRenderedNs: Set<string>,
): string {
   const parts: string[] = [];

   // Determine which namespace declarations are "visibly utilized"
   const visibleNs = collectVisiblyUtilizedNamespaces(element, opts);

   // Track which namespace prefixes need to be rendered at this element
   const toRender: XmlNamespace[] = [];
   const currentRenderedNs = new Set(parentRenderedNs);

   for (const ns of visibleNs) {
      const key = ns.prefix === null ? `__default__` : ns.prefix;
      const existingUri = parentRenderedNs.has(`${key}=${ns.uri}`);

      if (!existingUri) {
         toRender.push(ns);
         // Remove any previous mapping for this prefix
         for (const existing of currentRenderedNs) {
            if (existing.startsWith(`${key}=`)) {
               currentRenderedNs.delete(existing);
            }
         }
         currentRenderedNs.add(`${key}=${ns.uri}`);
      }
   }

   // Sort namespace declarations: default namespace first, then by prefix
   toRender.sort((a, b) => {
      if (a.prefix === null) return -1;
      if (b.prefix === null) return 1;
      return a.prefix.localeCompare(b.prefix);
   });

   // Sort attributes: by namespace URI, then local name
   const sortedAttrs = [...element.attributes].sort((a, b) => {
      // Attributes without namespace come first, sorted by name
      if (!a.namespaceUri && !b.namespaceUri) {
         return a.name.localeCompare(b.name);
      }
      if (!a.namespaceUri) return -1;
      if (!b.namespaceUri) return 1;
      const nsCompare = a.namespaceUri.localeCompare(b.namespaceUri);
      if (nsCompare !== 0) return nsCompare;
      return a.localName.localeCompare(b.localName);
   });

   // Build start tag
   parts.push(`<${element.name}`);

   // Render namespace declarations
   for (const ns of toRender) {
      if (ns.prefix) {
         parts.push(` xmlns:${ns.prefix}="${encodeC14NAttribute(ns.uri)}"`);
      } else {
         parts.push(` xmlns="${encodeC14NAttribute(ns.uri)}"`);
      }
   }

   // Render attributes
   for (const attr of sortedAttrs) {
      parts.push(` ${attr.name}="${encodeC14NAttribute(attr.value)}"`);
   }

   parts.push(">");

   // Render children (no self-closing in C14N)
   for (const child of element.children) {
      parts.push(canonicalizeNode(child, opts, currentRenderedNs));
   }

   parts.push(`</${element.name}>`);

   return parts.join("");
}

// =============================================================================
// Visible Namespace Collection (Exclusive C14N)
// =============================================================================

function collectVisiblyUtilizedNamespaces(
   element: XmlElement,
   opts: C14NOptions,
): XmlNamespace[] {
   const utilized = new Map<string | null, string>();
   const inclusivePrefixes = new Set(opts.inclusiveNamespaces);

   // Element's own prefix namespace
   if (element.prefix !== null && element.namespaceUri) {
      utilized.set(element.prefix, element.namespaceUri);
   } else if (element.prefix === null && element.namespaceUri) {
      // Default namespace on element
      utilized.set(null, element.namespaceUri);
   }

   // Attribute prefixed namespaces
   for (const attr of element.attributes) {
      if (attr.prefix && attr.namespaceUri) {
         utilized.set(attr.prefix, attr.namespaceUri);
      }
   }

   // Inclusive namespace prefixes (for exclusive C14N with inclusiveNamespaces list)
   if (opts.exclusive && inclusivePrefixes.size > 0) {
      for (const ns of collectAllAncestorNamespaces(element)) {
         if (ns.prefix !== null && inclusivePrefixes.has(ns.prefix)) {
            if (!utilized.has(ns.prefix)) {
               utilized.set(ns.prefix, ns.uri);
            }
         }
      }
   }

   // For non-exclusive (inclusive) C14N, include all inherited namespaces
   if (!opts.exclusive) {
      for (const ns of collectAllAncestorNamespaces(element)) {
         if (!utilized.has(ns.prefix)) {
            utilized.set(ns.prefix, ns.uri);
         }
      }
   }

   return Array.from(utilized.entries()).map(([prefix, uri]) => ({
      prefix,
      uri,
   }));
}

function collectAllAncestorNamespaces(element: XmlElement): XmlNamespace[] {
   const namespaces: XmlNamespace[] = [];
   let current = element.parent;

   while (current && current.type === XML_NODE_TYPES.ELEMENT) {
      for (const ns of current.namespaces) {
         namespaces.push(ns);
      }
      current = current.parent;
   }

   return namespaces;
}

// =============================================================================
// C14N Text Encoding
// =============================================================================

function canonicalizeText(text: string): string {
   return text
      .replace(/\r\n?/g, "\n")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\r/g, "&#xD;");
}

function encodeC14NAttribute(value: string): string {
   return value
      .replace(/\r\n?/g, "\n")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;")
      .replace(/\t/g, "&#x9;")
      .replace(/\n/g, "&#xA;")
      .replace(/\r/g, "&#xD;");
}
