/**
 * XML utility functions for namespace handling, entity encoding, and helpers
 */

import type {
   XmlAttribute,
   XmlDocument,
   XmlElement,
   XmlNamespace,
   XmlNode,
} from "./types.ts";
import { XML_NODE_TYPES } from "./types.ts";

// =============================================================================
// Entity Encoding / Decoding
// =============================================================================

const XML_ENTITIES: Record<string, string> = {
   "&amp;": "&",
   "&lt;": "<",
   "&gt;": ">",
   "&quot;": '"',
   "&apos;": "'",
};

const XML_ENTITY_ENCODE: Record<string, string> = {
   "&": "&amp;",
   "<": "&lt;",
   ">": "&gt;",
   '"': "&quot;",
   "'": "&apos;",
};

/** Decode XML entities in a string */
export function decodeEntities(text: string): string {
   return text.replace(
      /&(?:amp|lt|gt|quot|apos|#\d+|#x[\da-fA-F]+);/g,
      (match) => {
         if (match in XML_ENTITIES) {
            return XML_ENTITIES[match]!;
         }
         // Numeric character references
         if (match.startsWith("&#x")) {
            const code = Number.parseInt(match.slice(3, -1), 16);
            return String.fromCodePoint(code);
         }
         if (match.startsWith("&#")) {
            const code = Number.parseInt(match.slice(2, -1), 10);
            return String.fromCodePoint(code);
         }
         return match;
      },
   );
}

/** Encode special XML characters in text content */
export function encodeText(text: string): string {
   return text.replace(/[&<>]/g, (ch) => XML_ENTITY_ENCODE[ch] ?? ch);
}

/** Encode special XML characters in attribute values */
export function encodeAttribute(value: string): string {
   return value.replace(/[&<>"]/g, (ch) => XML_ENTITY_ENCODE[ch] ?? ch);
}

// =============================================================================
// Namespace Helpers
// =============================================================================

const XMLNS_URI = "http://www.w3.org/2000/xmlns/";
const XML_URI = "http://www.w3.org/XML/1998/namespace";

/** Split a qualified name into prefix and local name */
export function splitQName(name: string): {
   prefix: string | null;
   localName: string;
} {
   const colonIndex = name.indexOf(":");
   if (colonIndex === -1) {
      return { prefix: null, localName: name };
   }
   return {
      prefix: name.slice(0, colonIndex),
      localName: name.slice(colonIndex + 1),
   };
}

/** Resolve a namespace URI from a prefix by walking up the element tree */
export function resolveNamespace(
   prefix: string | null,
   element: XmlElement,
): string | null {
   // xml prefix is always bound
   if (prefix === "xml") return XML_URI;
   if (prefix === "xmlns") return XMLNS_URI;

   let current: XmlElement | XmlDocument | null = element;
   while (current && current.type === XML_NODE_TYPES.ELEMENT) {
      for (const ns of current.namespaces) {
         if (ns.prefix === prefix) {
            return ns.uri;
         }
      }
      current = current.parent;
   }
   return null;
}

/** Extract namespace declarations from attributes */
export function extractNamespaces(
   attributes: Array<{ name: string; value: string }>,
): {
   namespaces: XmlNamespace[];
   regularAttributes: Array<{ name: string; value: string }>;
} {
   const namespaces: XmlNamespace[] = [];
   const regularAttributes: Array<{ name: string; value: string }> = [];

   for (const attr of attributes) {
      if (attr.name === "xmlns") {
         namespaces.push({ prefix: null, uri: attr.value });
      } else if (attr.name.startsWith("xmlns:")) {
         namespaces.push({
            prefix: attr.name.slice(6),
            uri: attr.value,
         });
      } else {
         regularAttributes.push(attr);
      }
   }

   return { namespaces, regularAttributes };
}

/** Build a fully resolved XmlAttribute from a raw attribute */
export function resolveAttribute(
   name: string,
   value: string,
   element: XmlElement,
): XmlAttribute {
   const { prefix, localName } = splitQName(name);
   const namespaceUri = prefix ? resolveNamespace(prefix, element) : null;
   return { name, value, prefix, localName, namespaceUri };
}

// =============================================================================
// DOM Helpers
// =============================================================================

/** Create a new XmlDocument */
export function createDocument(options?: {
   xmlVersion?: string;
   encoding?: string;
   standalone?: boolean;
}): XmlDocument {
   return {
      type: XML_NODE_TYPES.DOCUMENT,
      xmlVersion: options?.xmlVersion ?? null,
      encoding: options?.encoding ?? null,
      standalone: options?.standalone ?? null,
      children: [],
      root: null,
   };
}

/** Create a new XmlElement */
export function createElement(
   name: string,
   namespaces: XmlNamespace[] = [],
   parent: XmlElement | XmlDocument | null = null,
): XmlElement {
   const { prefix, localName } = splitQName(name);
   return {
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
}

/** Find elements by tag name (non-recursive by default) */
export function findElements(
   parent: XmlElement | XmlDocument,
   tagName: string,
   recursive = false,
): XmlElement[] {
   const results: XmlElement[] = [];
   const children =
      parent.type === XML_NODE_TYPES.DOCUMENT
         ? parent.children
         : parent.children;

   for (const child of children) {
      if (
         child.type === XML_NODE_TYPES.ELEMENT &&
         (child.name === tagName || child.localName === tagName)
      ) {
         results.push(child);
      }
      if (recursive && child.type === XML_NODE_TYPES.ELEMENT) {
         results.push(...findElements(child, tagName, true));
      }
   }
   return results;
}

/** Get attribute value by name from an element */
export function getAttributeValue(
   element: XmlElement,
   name: string,
): string | null {
   const attr = element.attributes.find(
      (a) => a.name === name || a.localName === name,
   );
   return attr?.value ?? null;
}

/** Get the text content of an element (concatenating all text/cdata children) */
export function getTextContent(element: XmlElement): string {
   let text = "";
   for (const child of element.children) {
      if (
         child.type === XML_NODE_TYPES.TEXT ||
         child.type === XML_NODE_TYPES.CDATA
      ) {
         text += child.value;
      } else if (child.type === XML_NODE_TYPES.ELEMENT) {
         text += getTextContent(child);
      }
   }
   return text;
}

/** Collect all namespace declarations visible at a given element */
export function collectVisibleNamespaces(element: XmlElement): XmlNamespace[] {
   const nsMap = new Map<string | null, string>();
   let current: XmlElement | XmlDocument | null = element;

   while (current && current.type === XML_NODE_TYPES.ELEMENT) {
      for (const ns of current.namespaces) {
         if (!nsMap.has(ns.prefix)) {
            nsMap.set(ns.prefix, ns.uri);
         }
      }
      current = current.parent;
   }

   return Array.from(nsMap.entries()).map(([prefix, uri]) => ({
      prefix,
      uri,
   }));
}

/** Remove a child node from its parent */
export function removeChild(
   parent: XmlElement | XmlDocument,
   child: XmlNode,
): void {
   const idx =
      parent.type === XML_NODE_TYPES.DOCUMENT
         ? parent.children.indexOf(child)
         : parent.children.indexOf(child);
   if (idx !== -1) {
      parent.children.splice(idx, 1);
      if ("parent" in child) {
         (child as { parent: unknown }).parent = null;
      }
   }
}

/** Append a child node to a parent */
export function appendChild(
   parent: XmlElement | XmlDocument,
   child: XmlNode,
): void {
   parent.children.push(child);
   if ("parent" in child) {
      (child as { parent: unknown }).parent = parent;
   }
   if (
      parent.type === XML_NODE_TYPES.DOCUMENT &&
      child.type === XML_NODE_TYPES.ELEMENT &&
      parent.root === null
   ) {
      parent.root = child;
   }
}
