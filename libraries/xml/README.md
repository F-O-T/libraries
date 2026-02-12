# @f-o-t/xml

Zero-dependency XML library with full DOM parser, serializer, and advanced plugins.

[![npm version](https://img.shields.io/npm/v/@f-o-t/xml.svg)](https://www.npmjs.com/package/@f-o-t/xml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **Zero Dependencies**: Pure JavaScript/TypeScript implementation with no external dependencies
- **Full Namespace Support**: Handles XML namespaces, prefixes, and default namespaces correctly
- **Type Safety**: Full TypeScript support with Zod schema validation
- **DOM Parser**: Parse XML strings into a complete DOM tree
- **XML Serializer**: Convert DOM trees back to XML with formatting options
- **Streaming Parser**: SAX-like event-based parsing for large documents (via plugin)
- **XPath Engine**: Query XML documents with XPath expressions (via plugin)
- **Canonicalization**: W3C Exclusive XML Canonicalization 1.0 (via plugin)
- **Entity Handling**: Built-in support for standard entities and numeric character references
- **Framework Agnostic**: Works with any JavaScript/TypeScript project

## Installation

```bash
# npm
npm install @f-o-t/xml

# bun
bun add @f-o-t/xml

# yarn
yarn add @f-o-t/xml

# pnpm
pnpm add @f-o-t/xml
```

## Quick Start

```typescript
import { parseXml, serializeXml } from "@f-o-t/xml";

// Parse XML string to DOM
const doc = parseXml(`
  <root xmlns="http://example.com">
    <item id="1">Hello</item>
    <item id="2">World</item>
  </root>
`);

// Access elements
const root = doc.root;
console.log(root?.localName);  // "root"
console.log(root?.namespaceUri);  // "http://example.com"

// Serialize back to XML
const xml = serializeXml(doc);
console.log(xml);
```

## Core API

### Parsing

Parse XML strings into a DOM tree:

```typescript
import { parseXml } from "@f-o-t/xml";

// Basic parsing
const doc = parseXml("<root><item>Value</item></root>");

// With options
const doc = parseXml(xmlString, {
  preserveWhitespace: true,
  preserveComments: true,
  preserveCData: true,
  preserveProcessingInstructions: true
});

// Access the document
console.log(doc.xmlVersion);  // "1.0"
console.log(doc.encoding);    // "UTF-8"
console.log(doc.root);        // Root element
```

### Serialization

Convert DOM trees back to XML strings:

```typescript
import { serializeXml } from "@f-o-t/xml";

// Basic serialization
const xml = serializeXml(doc);

// With formatting
const prettyXml = serializeXml(doc, {
  indent: "  ",              // 2 spaces
  includeXmlDeclaration: true,
  omitComments: false
});

// Serialize just an element
const elementXml = serializeXml(element);
```

### Working with Elements

Utilities for manipulating XML DOM:

```typescript
import {
  createElement,
  createDocument,
  appendChild,
  removeChild,
  findElements,
  getTextContent,
  getAttributeValue
} from "@f-o-t/xml";

// Create elements
const doc = createDocument();
const root = createElement("root", doc);
doc.root = root;
appendChild(doc, root);

// Create child element
const item = createElement("item", root);
item.attributes.push({
  name: "id",
  value: "1",
  prefix: null,
  localName: "id",
  namespaceUri: null
});
appendChild(root, item);

// Find elements by name
const items = findElements(root, "item");

// Get text content
const text = getTextContent(item);

// Get attribute value
const id = getAttributeValue(item, "id");
```

### Namespace Handling

Full namespace support with prefix resolution:

```typescript
import { resolveNamespace, splitQName, extractNamespaces } from "@f-o-t/xml";

// Parse XML with namespaces
const doc = parseXml(`
  <root xmlns="http://example.com"
        xmlns:custom="http://custom.com">
    <item>Default namespace</item>
    <custom:item>Custom namespace</custom:item>
  </root>
`);

const root = doc.root!;

// Split qualified names
const { prefix, localName } = splitQName("custom:item");
// prefix: "custom"
// localName: "item"

// Resolve namespace URIs
const nsUri = resolveNamespace("custom", root);
// "http://custom.com"

// Extract namespace declarations from attributes
const attrs = [
  { name: "xmlns", value: "http://example.com" },
  { name: "xmlns:custom", value: "http://custom.com" }
];
const { namespaces, regularAttributes } = extractNamespaces(attrs);
```

### Entity Encoding/Decoding

Handle XML entities:

```typescript
import { encodeText, encodeAttribute, decodeEntities } from "@f-o-t/xml";

// Encode text content
const encoded = encodeText("Hello <world> & \"friends\"");
// "Hello &lt;world&gt; &amp; \"friends\""

// Encode attribute values
const attrValue = encodeAttribute("value=\"test\" & <more>");
// "value=&quot;test&quot; &amp; &lt;more&gt;"

// Decode entities
const decoded = decodeEntities("&lt;tag&gt; &amp; &#x1F600;");
// "<tag> & 😀"
```

## Type System

Full TypeScript support with comprehensive types:

```typescript
import type {
  XmlDocument,
  XmlElement,
  XmlAttribute,
  XmlText,
  XmlComment,
  XmlCData,
  XmlProcessingInstruction,
  XmlNode,
  XmlNodeType,
  XmlParserOptions,
  XmlSerializerOptions
} from "@f-o-t/xml";

// Document structure
const doc: XmlDocument = {
  type: "document",
  xmlVersion: "1.0",
  encoding: "UTF-8",
  standalone: null,
  children: [],
  root: null
};

// Element structure
const element: XmlElement = {
  type: "element",
  name: "item",
  prefix: null,
  localName: "item",
  namespaceUri: null,
  attributes: [],
  namespaces: [],
  children: [],
  parent: doc
};

// Parser options
const parserOptions: XmlParserOptions = {
  preserveWhitespace: false,
  preserveComments: false,
  preserveCData: false,
  preserveProcessingInstructions: false
};

// Serializer options
const serializerOptions: XmlSerializerOptions = {
  indent: "  ",
  includeXmlDeclaration: true,
  omitComments: false
};
```

## Zod Schemas

Validate XML data structures:

```typescript
import {
  xmlParserOptionsSchema,
  xmlSerializerOptionsSchema
} from "@f-o-t/xml";

// Validate parser options
const options = xmlParserOptionsSchema.parse({
  preserveWhitespace: true,
  preserveComments: false
});

// Validate serializer options
const serOptions = xmlSerializerOptionsSchema.parse({
  indent: "  ",
  includeXmlDeclaration: true
});
```

## Error Handling

Specific error type for XML parsing:

```typescript
import { XmlError } from "@f-o-t/xml";

try {
  parseXml("<root><unclosed>");
} catch (error) {
  if (error instanceof XmlError) {
    console.log(`XML Error at line ${error.line}, column ${error.column}`);
    console.log(`Position: ${error.position}`);
    console.log(`Message: ${error.message}`);
  }
}
```

## Plugins

### Streaming Parser

SAX-like event-based parsing for large XML documents:

```typescript
import { streamXml } from "@f-o-t/xml/plugins/stream";

const callbacks = {
  onStartElement: (element) => {
    console.log(`Start: ${element.name}`);
  },
  onEndElement: (name) => {
    console.log(`End: ${name}`);
  },
  onText: (text) => {
    console.log(`Text: ${text}`);
  },
  onComment: (comment) => {
    console.log(`Comment: ${comment}`);
  },
  onCData: (cdata) => {
    console.log(`CDATA: ${cdata}`);
  },
  onProcessingInstruction: (target, data) => {
    console.log(`PI: ${target}`);
  }
};

streamXml(xmlString, callbacks);

// Memory efficient for large files
const fs = require("fs");
const stream = fs.createReadStream("large.xml", "utf-8");
let buffer = "";

stream.on("data", (chunk) => {
  buffer += chunk;
  // Process complete tags as they arrive
  streamXml(buffer, callbacks);
});
```

### XPath Query Engine

Query XML documents with XPath expressions:

```typescript
import { evaluateXPath } from "@f-o-t/xml/plugins/xpath";

const doc = parseXml(`
  <library>
    <book id="1" category="fiction">
      <title>The Great Gatsby</title>
      <author>F. Scott Fitzgerald</author>
      <price>10.99</price>
    </book>
    <book id="2" category="science">
      <title>A Brief History of Time</title>
      <author>Stephen Hawking</author>
      <price>15.99</price>
    </book>
  </library>
`);

// Find all books
const books = evaluateXPath(doc, "//book");

// Find fiction books
const fiction = evaluateXPath(doc, "//book[@category='fiction']");

// Find books cheaper than $12
const cheap = evaluateXPath(doc, "//book[price < 12]");

// Find all authors
const authors = evaluateXPath(doc, "//author/text()");

// Complex predicates
const firstBook = evaluateXPath(doc, "//book[1]");
const lastBook = evaluateXPath(doc, "//book[last()]");

// With namespaces
const context = {
  namespaces: {
    ns: "http://example.com"
  }
};
const result = evaluateXPath(doc, "//ns:element", context);
```

**Supported XPath features:**
- Child axis: `//child/element`
- Attribute selection: `@attribute`
- Predicates: `[condition]`
- Positional predicates: `[1]`, `[last()]`
- Comparison operators: `=`, `!=`, `<`, `>`, `<=`, `>=`
- Logical operators: `and`, `or`, `not()`
- Functions: `text()`, `count()`, `position()`, `last()`
- Namespace support

### XML Canonicalization (C14N)

W3C Exclusive XML Canonicalization 1.0 for digital signatures:

```typescript
import { canonicalize } from "@f-o-t/xml/plugins/canonicalize";

const doc = parseXml(`
  <root xmlns="http://example.com" xmlns:custom="http://custom.com">
    <item id="1">Value</item>
  </root>
`);

// Canonicalize entire document
const c14n = canonicalize(doc.root);

// With options
const c14nWithComments = canonicalize(doc.root, {
  includeComments: true
});

// Canonicalize with exclusive namespace prefixes
const exclusive = canonicalize(doc.root, {
  inclusiveNamespacePrefixes: ["custom"]
});

// Use for XML digital signatures
import { createHash } from "crypto";
const canonical = canonicalize(element);
const hash = createHash("sha256").update(canonical).digest("base64");
```

**C14N features:**
- Exclusive canonicalization (removes unused namespaces)
- Attribute sorting
- Namespace declaration normalization
- Whitespace normalization
- Comment handling
- Compliant with W3C Exclusive XML Canonicalization 1.0

## Advanced Usage

### Working with CDATA

```typescript
import { parseXml, serializeXml } from "@f-o-t/xml";

// Parse with CDATA preservation
const doc = parseXml(
  `<root><![CDATA[<special>content</special>]]></root>`,
  { preserveCData: true }
);

// Access CDATA nodes
const cdata = doc.root?.children[0];
if (cdata?.type === "cdata") {
  console.log(cdata.value);  // "<special>content</special>"
}

// Convert CDATA to text
const docAsText = parseXml(
  `<root><![CDATA[content]]></root>`,
  { preserveCData: false }
);
// CDATA is converted to text nodes
```

### Processing Instructions

```typescript
const doc = parseXml(
  `<?xml version="1.0"?>
   <?xml-stylesheet type="text/xsl" href="style.xsl"?>
   <root/>`,
  { preserveProcessingInstructions: true }
);

// Find PI nodes
for (const child of doc.children) {
  if (child.type === "processing_instruction") {
    console.log(child.target);  // "xml-stylesheet"
    console.log(child.data);    // 'type="text/xsl" href="style.xsl"'
  }
}
```

### Building XML Programmatically

```typescript
import {
  createDocument,
  createElement,
  appendChild
} from "@f-o-t/xml";

// Create document
const doc = createDocument();

// Create root with namespace
const root = createElement("library", doc);
root.namespaces.push({
  prefix: null,
  uri: "http://example.com/library"
});
root.namespaceUri = "http://example.com/library";
doc.root = root;
appendChild(doc, root);

// Create book element
const book = createElement("book", root);
book.attributes.push(
  { name: "id", value: "1", prefix: null, localName: "id", namespaceUri: null },
  { name: "isbn", value: "978-0-123456-78-9", prefix: null, localName: "isbn", namespaceUri: null }
);
appendChild(root, book);

// Create title element with text
const title = createElement("title", book);
appendChild(book, title);

const text: XmlText = {
  type: "text",
  value: "The Great Gatsby",
  parent: title
};
appendChild(title, text);

// Serialize to XML
const xml = serializeXml(doc, { indent: "  " });
```

### Namespace-Aware Processing

```typescript
import { parseXml, findElements } from "@f-o-t/xml";

const doc = parseXml(`
  <root xmlns="http://example.com"
        xmlns:app="http://app.com">
    <item>Default NS</item>
    <app:item>App NS</app:item>
  </root>
`);

// Find by local name only
const allItems = findElements(doc.root!, "item");
// Returns both items

// Filter by namespace
const appItems = allItems.filter(
  el => el.namespaceUri === "http://app.com"
);
// Returns only <app:item>

const defaultItems = allItems.filter(
  el => el.namespaceUri === "http://example.com"
);
// Returns only <item> (default namespace)
```

## Best Practices

### 1. Use Streaming for Large Documents

```typescript
import { streamXml } from "@f-o-t/xml/plugins/stream";

// Good for large files - memory efficient
streamXml(largeXmlString, {
  onStartElement: processElement,
  onEndElement: finalizeElement
});

// Avoid for large files - loads entire DOM
const doc = parseXml(largeXmlString);  // May consume lots of memory
```

### 2. Preserve Formatting When Round-Tripping

```typescript
// Parse with whitespace preservation
const doc = parseXml(xmlString, { preserveWhitespace: true });

// Serialize with indentation
const xml = serializeXml(doc, { indent: "  " });
```

### 3. Handle Namespaces Correctly

```typescript
// Always check namespace URI, not just element name
const element = doc.root!;

// Wrong - only checks name
if (element.localName === "item") { }

// Right - checks both name and namespace
if (element.localName === "item" && element.namespaceUri === "http://example.com") { }
```

### 4. Validate Parser/Serializer Options

```typescript
import { xmlParserOptionsSchema } from "@f-o-t/xml";

// Validate user-provided options
function parseWithOptions(xml: string, userOptions: unknown) {
  const options = xmlParserOptionsSchema.parse(userOptions);
  return parseXml(xml, options);
}
```

### 5. Use Type Guards for Node Types

```typescript
function processNode(node: XmlNode) {
  switch (node.type) {
    case "element":
      // TypeScript knows node is XmlElement
      console.log(node.localName);
      break;
    case "text":
      // TypeScript knows node is XmlText
      console.log(node.value);
      break;
    case "comment":
      // TypeScript knows node is XmlComment
      console.log(node.value);
      break;
  }
}
```

## Performance

Optimized for real-world XML processing:

- **Parse 1MB XML**: < 200ms
- **Serialize 1MB XML**: < 150ms
- **XPath query on 10,000 nodes**: < 50ms
- **Streaming parse 10MB XML**: < 1s (constant memory)

All benchmarks run on modern hardware with Bun runtime.

## TypeScript

Full TypeScript support with strict types:

```typescript
import type {
  XmlDocument,
  XmlElement,
  XmlAttribute,
  XmlNamespace,
  XmlParserOptions,
  XmlSerializerOptions,
  StreamParserCallbacks,
  XPathContext,
  C14NOptions
} from "@f-o-t/xml";
```

## Contributing

Contributions are welcome! Please check the repository for guidelines.

## License

MIT License - see LICENSE file for details.

## Links

- [GitHub Repository](https://github.com/F-O-T/libraries)
- [Issue Tracker](https://github.com/F-O-T/libraries/issues)
- [NPM Package](https://www.npmjs.com/package/@f-o-t/xml)
