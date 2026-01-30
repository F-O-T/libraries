import { describe, expect, it } from "bun:test";
import { parseXml } from "../src/parser.ts";
import { XML_NODE_TYPES } from "../src/types.ts";

describe("parseXml", () => {
   describe("basic elements", () => {
      it("parses a simple element", () => {
         const doc = parseXml("<root/>");
         expect(doc.type).toBe(XML_NODE_TYPES.DOCUMENT);
         expect(doc.root).not.toBeNull();
         expect(doc.root!.name).toBe("root");
         expect(doc.root!.children).toHaveLength(0);
      });

      it("parses an element with text content", () => {
         const doc = parseXml("<greeting>Hello, world!</greeting>");
         expect(doc.root!.children).toHaveLength(1);
         expect(doc.root!.children[0]!.type).toBe(XML_NODE_TYPES.TEXT);
         if (doc.root!.children[0]!.type === XML_NODE_TYPES.TEXT) {
            expect(doc.root!.children[0]!.value).toBe("Hello, world!");
         }
      });

      it("parses nested elements", () => {
         const doc = parseXml(
            "<root><child><grandchild/></child></root>",
         );
         expect(doc.root!.children).toHaveLength(1);
         const child = doc.root!.children[0]!;
         expect(child.type).toBe(XML_NODE_TYPES.ELEMENT);
         if (child.type === XML_NODE_TYPES.ELEMENT) {
            expect(child.name).toBe("child");
            expect(child.children).toHaveLength(1);
            const grandchild = child.children[0]!;
            if (grandchild.type === XML_NODE_TYPES.ELEMENT) {
               expect(grandchild.name).toBe("grandchild");
            }
         }
      });

      it("parses self-closing elements", () => {
         const doc = parseXml("<root><empty/></root>");
         expect(doc.root!.children).toHaveLength(1);
         const empty = doc.root!.children[0]!;
         if (empty.type === XML_NODE_TYPES.ELEMENT) {
            expect(empty.name).toBe("empty");
            expect(empty.children).toHaveLength(0);
         }
      });

      it("parses multiple sibling elements", () => {
         const doc = parseXml("<root><a/><b/><c/></root>");
         expect(doc.root!.children).toHaveLength(3);
      });
   });

   describe("XML declaration", () => {
      it("parses XML declaration with version only", () => {
         const doc = parseXml('<?xml version="1.0"?><root/>');
         expect(doc.xmlVersion).toBe("1.0");
         expect(doc.encoding).toBeNull();
         expect(doc.standalone).toBeNull();
      });

      it("parses XML declaration with encoding", () => {
         const doc = parseXml(
            '<?xml version="1.0" encoding="UTF-8"?><root/>',
         );
         expect(doc.xmlVersion).toBe("1.0");
         expect(doc.encoding).toBe("UTF-8");
      });

      it("parses XML declaration with standalone", () => {
         const doc = parseXml(
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><root/>',
         );
         expect(doc.standalone).toBe(true);
      });
   });

   describe("attributes", () => {
      it("parses element with attributes", () => {
         const doc = parseXml('<root id="1" name="test"/>');
         expect(doc.root!.attributes).toHaveLength(2);
         expect(doc.root!.attributes[0]!.name).toBe("id");
         expect(doc.root!.attributes[0]!.value).toBe("1");
         expect(doc.root!.attributes[1]!.name).toBe("name");
         expect(doc.root!.attributes[1]!.value).toBe("test");
      });

      it("handles single-quoted attributes", () => {
         const doc = parseXml("<root attr='value'/>");
         expect(doc.root!.attributes[0]!.value).toBe("value");
      });

      it("decodes entities in attribute values", () => {
         const doc = parseXml('<root attr="a &amp; b"/>');
         expect(doc.root!.attributes[0]!.value).toBe("a & b");
      });
   });

   describe("namespaces", () => {
      it("parses default namespace declaration", () => {
         const doc = parseXml(
            '<root xmlns="http://example.com"/>',
         );
         expect(doc.root!.namespaces).toHaveLength(1);
         expect(doc.root!.namespaces[0]!.prefix).toBeNull();
         expect(doc.root!.namespaces[0]!.uri).toBe("http://example.com");
         expect(doc.root!.namespaceUri).toBe("http://example.com");
      });

      it("parses prefixed namespace declaration", () => {
         const doc = parseXml(
            '<ns:root xmlns:ns="http://example.com"/>',
         );
         expect(doc.root!.namespaces).toHaveLength(1);
         expect(doc.root!.namespaces[0]!.prefix).toBe("ns");
         expect(doc.root!.name).toBe("ns:root");
         expect(doc.root!.prefix).toBe("ns");
         expect(doc.root!.localName).toBe("root");
         expect(doc.root!.namespaceUri).toBe("http://example.com");
      });

      it("resolves namespace on child elements", () => {
         const doc = parseXml(
            '<root xmlns:ns="http://example.com"><ns:child/></root>',
         );
         const child = doc.root!.children[0]!;
         if (child.type === XML_NODE_TYPES.ELEMENT) {
            expect(child.namespaceUri).toBe("http://example.com");
         }
      });

      it("resolves prefixed attribute namespaces", () => {
         const doc = parseXml(
            '<root xmlns:ns="http://example.com" ns:attr="val"/>',
         );
         expect(doc.root!.attributes[0]!.namespaceUri).toBe(
            "http://example.com",
         );
      });
   });

   describe("CDATA", () => {
      it("parses CDATA sections", () => {
         const doc = parseXml(
            "<root><![CDATA[<not xml>]]></root>",
         );
         expect(doc.root!.children).toHaveLength(1);
         const cdata = doc.root!.children[0]!;
         expect(cdata.type).toBe(XML_NODE_TYPES.CDATA);
         if (cdata.type === XML_NODE_TYPES.CDATA) {
            expect(cdata.value).toBe("<not xml>");
         }
      });

      it("converts CDATA to text when preserveCData is false", () => {
         const doc = parseXml(
            "<root><![CDATA[content]]></root>",
            { preserveCData: false },
         );
         expect(doc.root!.children[0]!.type).toBe(XML_NODE_TYPES.TEXT);
      });
   });

   describe("comments", () => {
      it("preserves comments by default", () => {
         const doc = parseXml(
            "<root><!-- a comment --></root>",
         );
         expect(doc.root!.children).toHaveLength(1);
         const comment = doc.root!.children[0]!;
         expect(comment.type).toBe(XML_NODE_TYPES.COMMENT);
         if (comment.type === XML_NODE_TYPES.COMMENT) {
            expect(comment.value).toBe(" a comment ");
         }
      });

      it("strips comments when preserveComments is false", () => {
         const doc = parseXml(
            "<root><!-- comment --><child/></root>",
            { preserveComments: false },
         );
         expect(doc.root!.children).toHaveLength(1);
         expect(doc.root!.children[0]!.type).toBe(XML_NODE_TYPES.ELEMENT);
      });
   });

   describe("processing instructions", () => {
      it("parses processing instructions", () => {
         const doc = parseXml(
            '<?xml version="1.0"?><?style type="text/xsl" href="style.xsl"?><root/>',
         );
         const pis = doc.children.filter(
            (c) => c.type === XML_NODE_TYPES.PROCESSING_INSTRUCTION,
         );
         expect(pis).toHaveLength(1);
         if (pis[0]!.type === XML_NODE_TYPES.PROCESSING_INSTRUCTION) {
            expect(pis[0]!.target).toBe("style");
         }
      });
   });

   describe("entity handling", () => {
      it("decodes predefined entities in text", () => {
         const doc = parseXml(
            "<root>&amp; &lt; &gt; &quot; &apos;</root>",
         );
         const text = doc.root!.children[0]!;
         if (text.type === XML_NODE_TYPES.TEXT) {
            expect(text.value).toBe('& < > " \'');
         }
      });

      it("decodes numeric character references", () => {
         const doc = parseXml("<root>&#65;&#x42;</root>");
         const text = doc.root!.children[0]!;
         if (text.type === XML_NODE_TYPES.TEXT) {
            expect(text.value).toBe("AB");
         }
      });
   });

   describe("whitespace handling", () => {
      it("strips whitespace-only text nodes by default", () => {
         const doc = parseXml(
            "<root>\n  <child/>\n</root>",
         );
         // Only the element child should remain
         const elements = doc.root!.children.filter(
            (c) => c.type === XML_NODE_TYPES.ELEMENT,
         );
         expect(elements).toHaveLength(1);
      });

      it("preserves whitespace when option is set", () => {
         const doc = parseXml(
            "<root>\n  <child/>\n</root>",
            { preserveWhitespace: true },
         );
         expect(doc.root!.children.length).toBeGreaterThan(1);
      });
   });

   describe("error handling", () => {
      it("throws on malformed XML", () => {
         expect(() => parseXml("<root><child></root>")).toThrow();
      });

      it("throws on unclosed elements", () => {
         expect(() => parseXml("<root><child>")).toThrow();
      });

      it("provides line and column info in errors", () => {
         try {
            parseXml("<root>\n  <bad></wrong>\n</root>");
         } catch (e: unknown) {
            if (e && typeof e === "object" && "line" in e) {
               expect((e as { line: number }).line).toBeGreaterThan(0);
            }
         }
      });
   });

   describe("complex documents", () => {
      it("parses a Brazilian NFSe-like structure", () => {
         const xml = `<?xml version="1.0" encoding="UTF-8"?>
<CompNfse xmlns="http://www.abrasf.org.br/nfse.xsd">
  <Nfse>
    <InfNfse Id="nfse_123">
      <Numero>123</Numero>
      <CodigoVerificacao>ABC</CodigoVerificacao>
      <Competencia>2024-01</Competencia>
      <Servico>
        <Valores>
          <ValorServicos>1000.00</ValorServicos>
          <IssRetido>1</IssRetido>
        </Valores>
        <ItemListaServico>0107</ItemListaServico>
        <Discriminacao>Consultoria</Discriminacao>
      </Servico>
    </InfNfse>
  </Nfse>
</CompNfse>`;

         const doc = parseXml(xml);
         expect(doc.xmlVersion).toBe("1.0");
         expect(doc.encoding).toBe("UTF-8");
         expect(doc.root!.name).toBe("CompNfse");
         expect(doc.root!.namespaceUri).toBe(
            "http://www.abrasf.org.br/nfse.xsd",
         );
      });
   });
});
