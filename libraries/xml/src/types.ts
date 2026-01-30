/**
 * XML DOM Node Types
 *
 * Lightweight DOM model for representing parsed XML documents.
 * All node types are plain objects for easy serialization and manipulation.
 */

// =============================================================================
// Node Type Constants
// =============================================================================

export const XML_NODE_TYPES = {
   DOCUMENT: "document",
   ELEMENT: "element",
   TEXT: "text",
   CDATA: "cdata",
   COMMENT: "comment",
   PROCESSING_INSTRUCTION: "processing-instruction",
} as const;

export type XmlNodeType = (typeof XML_NODE_TYPES)[keyof typeof XML_NODE_TYPES];

// =============================================================================
// Namespace Types
// =============================================================================

export interface XmlNamespace {
   prefix: string | null;
   uri: string;
}

// =============================================================================
// Attribute Types
// =============================================================================

export interface XmlAttribute {
   name: string;
   value: string;
   prefix: string | null;
   localName: string;
   namespaceUri: string | null;
}

// =============================================================================
// Node Types
// =============================================================================

export interface XmlElement {
   type: typeof XML_NODE_TYPES.ELEMENT;
   name: string;
   prefix: string | null;
   localName: string;
   namespaceUri: string | null;
   attributes: XmlAttribute[];
   namespaces: XmlNamespace[];
   children: XmlNode[];
   parent: XmlElement | XmlDocument | null;
}

export interface XmlText {
   type: typeof XML_NODE_TYPES.TEXT;
   value: string;
   parent: XmlElement | null;
}

export interface XmlCData {
   type: typeof XML_NODE_TYPES.CDATA;
   value: string;
   parent: XmlElement | null;
}

export interface XmlComment {
   type: typeof XML_NODE_TYPES.COMMENT;
   value: string;
   parent: XmlElement | XmlDocument | null;
}

export interface XmlProcessingInstruction {
   type: typeof XML_NODE_TYPES.PROCESSING_INSTRUCTION;
   target: string;
   data: string;
   parent: XmlElement | XmlDocument | null;
}

export type XmlNode =
   | XmlElement
   | XmlText
   | XmlCData
   | XmlComment
   | XmlProcessingInstruction;

export type XmlChildNode = XmlNode;

// =============================================================================
// Document Type
// =============================================================================

export interface XmlDocument {
   type: typeof XML_NODE_TYPES.DOCUMENT;
   xmlVersion: string | null;
   encoding: string | null;
   standalone: boolean | null;
   children: XmlNode[];
   root: XmlElement | null;
}

// =============================================================================
// Parser Options
// =============================================================================

export interface XmlParserOptions {
   /** Preserve whitespace-only text nodes (default: false) */
   preserveWhitespace?: boolean;
   /** Preserve comments in the DOM tree (default: true) */
   preserveComments?: boolean;
   /** Preserve processing instructions in the DOM tree (default: true) */
   preserveProcessingInstructions?: boolean;
   /** Preserve CDATA sections instead of converting to text (default: true) */
   preserveCData?: boolean;
}

// =============================================================================
// Serializer Options
// =============================================================================

export interface XmlSerializerOptions {
   /** Include XML declaration (default: true) */
   declaration?: boolean;
   /** Indentation string (default: "  " for 2 spaces, empty for no formatting) */
   indent?: string;
   /** Newline string (default: "\n") */
   newline?: string;
   /** Self-close empty elements (default: true) */
   selfClose?: boolean;
}

// =============================================================================
// Streaming Parser Types
// =============================================================================

export interface StreamParserCallbacks {
   onDocumentStart?: () => void;
   onDocumentEnd?: () => void;
   onElementStart?: (
      name: string,
      attributes: XmlAttribute[],
      namespaces: XmlNamespace[],
      prefix: string | null,
      localName: string,
      namespaceUri: string | null,
   ) => void;
   onElementEnd?: (
      name: string,
      prefix: string | null,
      localName: string,
      namespaceUri: string | null,
   ) => void;
   onText?: (value: string) => void;
   onCData?: (value: string) => void;
   onComment?: (value: string) => void;
   onProcessingInstruction?: (target: string, data: string) => void;
   onXmlDeclaration?: (
      version: string,
      encoding: string | null,
      standalone: boolean | null,
   ) => void;
   onError?: (error: XmlError) => void;
}

// =============================================================================
// XPath Types
// =============================================================================

export interface XPathContext {
   /** Namespace prefix → URI mappings for use in XPath expressions */
   namespaces?: Record<string, string>;
}

// =============================================================================
// Canonicalization Types
// =============================================================================

export interface C14NOptions {
   /** Use exclusive canonicalization (default: true) */
   exclusive?: boolean;
   /** Include comments in canonical form (default: false) */
   withComments?: boolean;
   /** Inclusive namespace prefix list for exclusive C14N */
   inclusiveNamespaces?: string[];
}

// =============================================================================
// Error Types
// =============================================================================

export class XmlError extends Error {
   constructor(
      message: string,
      public readonly line: number,
      public readonly column: number,
      public readonly offset: number,
   ) {
      super(`XML Error at ${line}:${column}: ${message}`);
      this.name = "XmlError";
   }
}
