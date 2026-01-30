import { describe, expect, it } from "bun:test";
import { parseXml } from "../src/parser.ts";
import { serializeXml } from "../src/serializer.ts";

describe("serializeXml", () => {
   describe("basic serialization", () => {
      it("serializes a simple element", () => {
         const doc = parseXml("<root/>");
         const xml = serializeXml(doc, {
            declaration: false,
            indent: "",
         });
         expect(xml).toBe("<root/>");
      });

      it("serializes element with text content", () => {
         const doc = parseXml("<greeting>Hello</greeting>");
         const xml = serializeXml(doc, {
            declaration: false,
            indent: "",
         });
         expect(xml).toBe("<greeting>Hello</greeting>");
      });

      it("serializes nested elements with indentation", () => {
         const doc = parseXml("<root><child><grandchild/></child></root>");
         const xml = serializeXml(doc, {
            declaration: false,
            indent: "  ",
         });
         expect(xml).toContain("  <child>");
         expect(xml).toContain("    <grandchild/>");
      });
   });

   describe("XML declaration", () => {
      it("includes declaration when option is true", () => {
         const doc = parseXml('<?xml version="1.0" encoding="UTF-8"?><root/>');
         const xml = serializeXml(doc, { declaration: true, indent: "" });
         expect(xml).toStartWith('<?xml version="1.0" encoding="UTF-8"?>');
      });

      it("omits declaration when option is false", () => {
         const doc = parseXml('<?xml version="1.0"?><root/>');
         const xml = serializeXml(doc, { declaration: false, indent: "" });
         expect(xml).not.toContain("<?xml");
      });
   });

   describe("attributes", () => {
      it("serializes attributes", () => {
         const doc = parseXml('<root id="1" name="test"/>');
         const xml = serializeXml(doc, {
            declaration: false,
            indent: "",
         });
         expect(xml).toBe('<root id="1" name="test"/>');
      });

      it("encodes special characters in attribute values", () => {
         const doc = parseXml('<root attr="a &amp; b"/>');
         const xml = serializeXml(doc, {
            declaration: false,
            indent: "",
         });
         expect(xml).toContain('attr="a &amp; b"');
      });
   });

   describe("namespaces", () => {
      it("serializes namespace declarations", () => {
         const doc = parseXml('<root xmlns="http://example.com"/>');
         const xml = serializeXml(doc, {
            declaration: false,
            indent: "",
         });
         expect(xml).toContain('xmlns="http://example.com"');
      });

      it("serializes prefixed namespaces", () => {
         const doc = parseXml('<ns:root xmlns:ns="http://example.com"/>');
         const xml = serializeXml(doc, {
            declaration: false,
            indent: "",
         });
         expect(xml).toContain('xmlns:ns="http://example.com"');
         expect(xml).toContain("ns:root");
      });
   });

   describe("special content", () => {
      it("serializes CDATA sections", () => {
         const doc = parseXml("<root><![CDATA[<raw>]]></root>");
         const xml = serializeXml(doc, {
            declaration: false,
            indent: "",
         });
         expect(xml).toContain("<![CDATA[<raw>]]>");
      });

      it("serializes comments", () => {
         const doc = parseXml("<root><!-- comment --></root>");
         const xml = serializeXml(doc, {
            declaration: false,
            indent: "",
         });
         expect(xml).toContain("<!-- comment -->");
      });

      it("encodes special characters in text", () => {
         const doc = parseXml("<root>&amp; &lt; &gt;</root>");
         const xml = serializeXml(doc, {
            declaration: false,
            indent: "",
         });
         expect(xml).toContain("&amp; &lt; &gt;");
      });
   });

   describe("self-closing", () => {
      it("uses self-closing for empty elements by default", () => {
         const doc = parseXml("<root><empty></empty></root>");
         const xml = serializeXml(doc, {
            declaration: false,
            indent: "",
            selfClose: true,
         });
         expect(xml).toContain("<empty/>");
      });

      it("uses open/close tags when selfClose is false", () => {
         const doc = parseXml("<root><empty/></root>");
         const xml = serializeXml(doc, {
            declaration: false,
            indent: "",
            selfClose: false,
         });
         expect(xml).toContain("<empty></empty>");
      });
   });

   describe("round-trip", () => {
      it("round-trips a complex document", () => {
         const original =
            '<?xml version="1.0" encoding="UTF-8"?><root xmlns="http://example.com" xmlns:ns="http://ns.com"><ns:child attr="val">text</ns:child><![CDATA[raw]]><!-- comment --></root>';
         const doc = parseXml(original);
         const xml = serializeXml(doc, { indent: "" });
         const doc2 = parseXml(xml);
         expect(doc2.root!.name).toBe("root");
         expect(doc2.root!.children.length).toBe(doc.root!.children.length);
      });
   });
});
