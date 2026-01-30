import { describe, expect, it } from "bun:test";
import { streamParseXml } from "../src/stream-parser.ts";

describe("streamParseXml", () => {
   it("fires document start and end events", () => {
      let started = false;
      let ended = false;

      streamParseXml("<root/>", {
         onDocumentStart: () => {
            started = true;
         },
         onDocumentEnd: () => {
            ended = true;
         },
      });

      expect(started).toBe(true);
      expect(ended).toBe(true);
   });

   it("fires element start and end events", () => {
      const elements: string[] = [];
      const closed: string[] = [];

      streamParseXml("<root><child/></root>", {
         onElementStart: (name) => elements.push(name),
         onElementEnd: (name) => closed.push(name),
      });

      expect(elements).toEqual(["root", "child"]);
      expect(closed).toEqual(["child", "root"]);
   });

   it("fires text events", () => {
      const texts: string[] = [];

      streamParseXml("<root>Hello <child>World</child></root>", {
         onText: (value) => texts.push(value),
      });

      expect(texts).toEqual(["Hello ", "World"]);
   });

   it("fires CDATA events", () => {
      const cdatas: string[] = [];

      streamParseXml("<root><![CDATA[raw content]]></root>", {
         onCData: (value) => cdatas.push(value),
      });

      expect(cdatas).toEqual(["raw content"]);
   });

   it("fires comment events", () => {
      const comments: string[] = [];

      streamParseXml("<root><!-- hello --></root>", {
         onComment: (value) => comments.push(value),
      });

      expect(comments).toEqual([" hello "]);
   });

   it("fires processing instruction events", () => {
      const pis: Array<{ target: string; data: string }> = [];

      streamParseXml('<?xml version="1.0"?><?style href="style.xsl"?><root/>', {
         onProcessingInstruction: (target, data) => pis.push({ target, data }),
      });

      expect(pis).toHaveLength(1);
      expect(pis[0]!.target).toBe("style");
   });

   it("fires XML declaration event", () => {
      let version: string | null = null;
      let encoding: string | null = null;

      streamParseXml('<?xml version="1.0" encoding="UTF-8"?><root/>', {
         onXmlDeclaration: (v, e) => {
            version = v;
            encoding = e;
         },
      });

      expect(version).toBe("1.0");
      expect(encoding).toBe("UTF-8");
   });

   it("provides namespace info on elements", () => {
      let nsUri: string | null = null;

      streamParseXml('<ns:root xmlns:ns="http://example.com"/>', {
         onElementStart: (
            _name,
            _attrs,
            _ns,
            _prefix,
            _localName,
            namespaceUri,
         ) => {
            nsUri = namespaceUri;
         },
      });

      expect(nsUri).toBe("http://example.com");
   });

   it("provides attributes with resolved namespaces", () => {
      const attrs: Array<{ name: string; namespaceUri: string | null }> = [];

      streamParseXml('<root xmlns:ns="http://example.com" ns:attr="val"/>', {
         onElementStart: (_name, attributes) => {
            for (const a of attributes) {
               attrs.push({
                  name: a.name,
                  namespaceUri: a.namespaceUri,
               });
            }
         },
      });

      expect(attrs).toHaveLength(1);
      expect(attrs[0]!.name).toBe("ns:attr");
      expect(attrs[0]!.namespaceUri).toBe("http://example.com");
   });

   it("fires onError for malformed XML", () => {
      let errorMessage: string | null = null;

      streamParseXml("<root><bad></wrong></root>", {
         onError: (err) => {
            errorMessage = err.message;
         },
      });

      expect(errorMessage).not.toBeNull();
   });
});
