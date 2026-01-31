import { describe, expect, it } from "bun:test";
import { parseXml } from "../src/parser.ts";
import { canonicalize } from "../src/plugins/canonicalize/index.ts";

describe("canonicalize", () => {
   describe("basic C14N rules", () => {
      it("expands self-closing elements", () => {
         const doc = parseXml("<root><empty/></root>");
         const result = canonicalize(doc.root!);
         expect(result).toContain("<empty></empty>");
      });

      it("sorts attributes by name", () => {
         const doc = parseXml('<root z="3" a="1" m="2"/>');
         const result = canonicalize(doc.root!);
         expect(result).toBe('<root a="1" m="2" z="3"></root>');
      });

      it("preserves text content exactly", () => {
         const doc = parseXml("<root>  hello  world  </root>");
         const result = canonicalize(doc.root!, { exclusive: true });
         expect(result).toContain("  hello  world  ");
      });

      it("replaces CDATA with text", () => {
         const doc = parseXml("<root><![CDATA[some content]]></root>");
         const result = canonicalize(doc.root!);
         expect(result).not.toContain("CDATA");
         expect(result).toContain("some content");
      });

      it("excludes comments by default", () => {
         const doc = parseXml("<root><!-- comment --><child/></root>");
         const result = canonicalize(doc.root!);
         expect(result).not.toContain("comment");
      });

      it("includes comments when withComments is true", () => {
         const doc = parseXml("<root><!-- comment --><child/></root>");
         const result = canonicalize(doc.root!, { withComments: true });
         expect(result).toContain("<!-- comment -->");
      });
   });

   describe("namespace handling", () => {
      it("outputs namespace declarations for visibly utilized prefixes", () => {
         const doc = parseXml(
            '<ns:root xmlns:ns="http://example.com"><ns:child/></ns:root>',
         );
         const result = canonicalize(doc.root!);
         expect(result).toContain('xmlns:ns="http://example.com"');
      });

      it("does not output unused namespace declarations in exclusive mode", () => {
         const doc = parseXml(
            '<root xmlns:unused="http://unused.com"><child/></root>',
         );
         const result = canonicalize(doc.root!, { exclusive: true });
         expect(result).not.toContain("unused");
      });

      it("handles default namespace", () => {
         const doc = parseXml(
            '<root xmlns="http://example.com"><child/></root>',
         );
         const result = canonicalize(doc.root!);
         expect(result).toContain('xmlns="http://example.com"');
      });
   });

   describe("entity encoding", () => {
      it("encodes special characters in text", () => {
         const doc = parseXml("<root>&amp; &lt; &gt;</root>");
         const result = canonicalize(doc.root!);
         expect(result).toContain("&amp; &lt; &gt;");
      });

      it("encodes special characters in attributes", () => {
         const doc = parseXml('<root attr="a &amp; b"/>');
         const result = canonicalize(doc.root!);
         expect(result).toContain('attr="a &amp; b"');
      });
   });

   describe("real-world XML-DSig scenario", () => {
      it("canonicalizes a SignedInfo-like element", () => {
         const xml = `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">
  <CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
  <SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
  <Reference URI="#NFe123">
    <Transforms>
      <Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
      <Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
    </Transforms>
    <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
    <DigestValue>abc123</DigestValue>
  </Reference>
</SignedInfo>`;

         const doc = parseXml(xml);
         const result = canonicalize(doc.root!);

         // C14N should produce valid canonical form
         expect(result).toContain("<SignedInfo");
         expect(result).toContain("</SignedInfo>");
         // No self-closing elements
         expect(result).not.toContain("/>");
         // Namespace should be declared
         expect(result).toContain('xmlns="http://www.w3.org/2000/09/xmldsig#"');
      });
   });
});
