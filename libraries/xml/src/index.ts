/**
 * @f-o-t/xml — Zero-dependency XML library
 *
 * DOM parser, serializer, types, and utilities.
 * Sub-exports available:
 * - `@f-o-t/xml/stream` — SAX-like streaming parser
 * - `@f-o-t/xml/xpath` — XPath query engine
 * - `@f-o-t/xml/canonicalize` — W3C Exclusive C14N
 *
 * @packageDocumentation
 */

// =============================================================================
// Parser
// =============================================================================

export { parseXml } from "./parser.ts";

// =============================================================================
// Serializer
// =============================================================================

export { serializeXml } from "./serializer.ts";

// =============================================================================
// Types
// =============================================================================

export type {
   C14NOptions,
   StreamParserCallbacks,
   XmlAttribute,
   XmlCData,
   XmlChildNode,
   XmlComment,
   XmlDocument,
   XmlElement,
   XmlNamespace,
   XmlNode,
   XmlNodeType,
   XmlParserOptions,
   XmlProcessingInstruction,
   XmlSerializerOptions,
   XmlText,
   XPathContext,
} from "./types.ts";
export { XML_NODE_TYPES, XmlError } from "./types.ts";

// =============================================================================
// Schemas
// =============================================================================

export {
   c14nOptionsSchema,
   xmlParserOptionsSchema,
   xmlSerializerOptionsSchema,
   xpathContextSchema,
} from "./schemas.ts";

// =============================================================================
// Utilities
// =============================================================================

export {
   appendChild,
   collectVisibleNamespaces,
   createDocument,
   createElement,
   decodeEntities,
   encodeAttribute,
   encodeText,
   extractNamespaces,
   findElements,
   getAttributeValue,
   getTextContent,
   removeChild,
   resolveAttribute,
   resolveNamespace,
   splitQName,
} from "./utils.ts";
