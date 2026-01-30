import { describe, expect, it } from "bun:test";
import { parseXml } from "../src/parser.ts";
import { XML_NODE_TYPES } from "../src/types.ts";
import { queryXPath, queryXPathFirst, queryXPathText } from "../src/xpath.ts";

const sampleXml = `<?xml version="1.0"?>
<bookstore>
  <book category="fiction">
    <title lang="en">Harry Potter</title>
    <author>J.K. Rowling</author>
    <price>29.99</price>
  </book>
  <book category="tech">
    <title lang="en">Learning XML</title>
    <author>Erik T. Ray</author>
    <price>39.95</price>
  </book>
  <book category="fiction">
    <title lang="pt">Dom Casmurro</title>
    <author>Machado de Assis</author>
    <price>19.90</price>
  </book>
</bookstore>`;

describe("queryXPath", () => {
   const doc = parseXml(sampleXml);

   describe("basic paths", () => {
      it("selects child elements", () => {
         const results = queryXPath(doc, "/bookstore/book");
         expect(results).toHaveLength(3);
      });

      it("selects nested children", () => {
         const results = queryXPath(doc, "/bookstore/book/title");
         expect(results).toHaveLength(3);
      });

      it("selects from root", () => {
         const results = queryXPath(doc, "/bookstore");
         expect(results).toHaveLength(1);
         if (results[0]!.type === XML_NODE_TYPES.ELEMENT) {
            expect(results[0]!.name).toBe("bookstore");
         }
      });
   });

   describe("descendant axis (//)", () => {
      it("selects all descendants", () => {
         const results = queryXPath(doc, "//title");
         expect(results).toHaveLength(3);
      });

      it("selects deep descendants", () => {
         const results = queryXPath(doc, "//author");
         expect(results).toHaveLength(3);
      });
   });

   describe("predicates", () => {
      it("filters by position", () => {
         const results = queryXPath(doc, "/bookstore/book[1]");
         expect(results).toHaveLength(1);
         if (results[0]!.type === XML_NODE_TYPES.ELEMENT) {
            const title = results[0]!.children.find(
               (c) => c.type === XML_NODE_TYPES.ELEMENT && c.name === "title",
            );
            if (title && title.type === XML_NODE_TYPES.ELEMENT) {
               const text = title.children[0];
               if (text && text.type === XML_NODE_TYPES.TEXT) {
                  expect(text.value).toBe("Harry Potter");
               }
            }
         }
      });

      it("filters by attribute existence", () => {
         const results = queryXPath(doc, "//title[@lang]");
         expect(results).toHaveLength(3);
      });

      it("filters by attribute value", () => {
         const results = queryXPath(doc, "//book[@category='tech']");
         expect(results).toHaveLength(1);
      });

      it("filters by child element value", () => {
         const results = queryXPath(
            doc,
            "/bookstore/book[author='Machado de Assis']",
         );
         expect(results).toHaveLength(1);
      });
   });

   describe("text() function", () => {
      it("selects text nodes", () => {
         const results = queryXPath(doc, "//title/text()");
         expect(results).toHaveLength(3);
         expect(results[0]!.type).toBe(XML_NODE_TYPES.TEXT);
      });
   });

   describe("wildcard", () => {
      it("matches any element with *", () => {
         const results = queryXPath(doc, "/bookstore/*");
         expect(results).toHaveLength(3);
      });
   });
});

describe("queryXPathFirst", () => {
   const doc = parseXml(sampleXml);

   it("returns the first matching node", () => {
      const result = queryXPathFirst(doc, "//title");
      expect(result).not.toBeNull();
      if (result && result.type === XML_NODE_TYPES.ELEMENT) {
         expect(result.name).toBe("title");
      }
   });

   it("returns null when no match", () => {
      const result = queryXPathFirst(doc, "//nonexistent");
      expect(result).toBeNull();
   });
});

describe("queryXPathText", () => {
   const doc = parseXml(sampleXml);

   it("returns text content of matching elements", () => {
      const texts = queryXPathText(doc, "//author");
      expect(texts).toEqual([
         "J.K. Rowling",
         "Erik T. Ray",
         "Machado de Assis",
      ]);
   });

   it("returns text from text() nodes", () => {
      const texts = queryXPathText(doc, "//price/text()");
      expect(texts).toEqual(["29.99", "39.95", "19.90"]);
   });
});

describe("namespace-aware XPath", () => {
   const nsXml = `<root xmlns:ns="http://example.com">
    <ns:item id="1">First</ns:item>
    <ns:item id="2">Second</ns:item>
    <other>Third</other>
  </root>`;

   const doc = parseXml(nsXml);

   it("queries with namespace prefix", () => {
      const results = queryXPath(doc, "//ns:item", {
         namespaces: { ns: "http://example.com" },
      });
      expect(results).toHaveLength(2);
   });
});
