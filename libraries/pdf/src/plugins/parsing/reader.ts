import { PDFParser } from "./parser.ts";
import type { PDFDictionary, PDFRef, PDFArray } from "../../types.ts";
import { PDFParseError } from "../../errors.ts";

/**
 * Parsed PDF Document
 */
export interface ParsedPDF {
   version: string;
   catalog: PDFRef;
   pages: ParsedPDFPage[];
   objects: Map<number, any>;
}

/**
 * Parsed PDF Page
 */
export interface ParsedPDFPage {
   ref: PDFRef;
   size: { width: number; height: number };
   content: string;
}

/**
 * PDF Reader - reads and parses existing PDFs
 */
export class PDFReader {
   private data: Uint8Array;
   private objects: Map<number, any> = new Map();

   constructor(data: Uint8Array) {
      this.data = data;
   }

   /**
    * Parse PDF file
    */
   parse(): ParsedPDF {
      // 1. Find and parse xref table
      const xrefOffset = this.findStartXRef();
      const xrefTable = this.parseXRefTable(xrefOffset);

      // 2. Parse trailer
      const trailer = this.parseTrailer(xrefOffset);
      const catalogRef = trailer.Root as PDFRef;

      // 3. Read all objects using xref table
      this.readObjects(xrefTable);

      // 4. Get PDF version from header
      const version = this.parseVersion();

      // 5. Parse pages
      const pages = this.parsePages(catalogRef);

      return {
         version,
         catalog: catalogRef,
         pages,
         objects: this.objects,
      };
   }

   /**
    * Find startxref offset
    */
   private findStartXRef(): number {
      const decoder = new TextDecoder();
      const content = decoder.decode(this.data);
      const match = content.match(/startxref\s+(\d+)/);
      if (!match) {
         throw new PDFParseError("Could not find startxref");
      }
      return parseInt(match[1], 10);
   }

   /**
    * Parse xref table
    */
   private parseXRefTable(offset: number): Map<number, number> {
      const decoder = new TextDecoder();
      const content = decoder.decode(this.data.slice(offset));
      const lines = content.split("\n");

      const xref = new Map<number, number>();
      let i = 0;

      // Skip "xref" keyword
      while (i < lines.length && !lines[i].trim().startsWith("xref")) i++;
      i++;

      // Parse subsections
      while (i < lines.length && !lines[i].trim().startsWith("trailer")) {
         const subsection = lines[i].trim().split(/\s+/);
         if (subsection.length === 2) {
            const start = parseInt(subsection[0], 10);
            const count = parseInt(subsection[1], 10);
            i++;

            // Parse entries
            for (let j = 0; j < count; j++) {
               const entry = lines[i].trim().split(/\s+/);
               if (entry.length >= 3 && entry[2] === "n") {
                  const offset = parseInt(entry[0], 10);
                  xref.set(start + j, offset);
               }
               i++;
            }
         } else {
            i++;
         }
      }

      return xref;
   }

   /**
    * Parse trailer dictionary
    */
   private parseTrailer(xrefOffset: number): PDFDictionary {
      const decoder = new TextDecoder();
      const content = decoder.decode(this.data.slice(xrefOffset));
      const trailerMatch = content.match(/trailer\s*<<[\s\S]*?>>/);
      if (!trailerMatch) {
         throw new PDFParseError("Could not find trailer");
      }

      const parser = new PDFParser(new TextEncoder().encode(trailerMatch[0].replace("trailer", "")));
      return parser.parseValue() as PDFDictionary;
   }

   /**
    * Read all objects from xref table
    */
   private readObjects(xrefTable: Map<number, number>): void {
      for (const [objectNum, offset] of xrefTable) {
         try {
           const objData = this.data.slice(offset);
           const parser = new PDFParser(objData);
           const obj = parser.parseIndirectObject();
           this.objects.set(objectNum, obj.value);
         } catch (error) {
           // Skip malformed objects
         }
      }
   }

   /**
    * Parse PDF version from header
    */
   private parseVersion(): string {
      const decoder = new TextDecoder();
      const header = decoder.decode(this.data.slice(0, 20));
      const match = header.match(/%PDF-(\d+\.\d+)/);
      return match ? match[1] : "1.7";
   }

   /**
    * Parse pages from catalog
    */
   private parsePages(catalogRef: PDFRef): ParsedPDFPage[] {
      const catalog = this.objects.get(catalogRef.objectNumber) as PDFDictionary;
      if (!catalog) {
         throw new PDFParseError("Catalog not found");
      }

      const pagesRef = catalog.Pages as PDFRef;
      const pagesTree = this.objects.get(pagesRef.objectNumber) as PDFDictionary;
      if (!pagesTree) {
         throw new PDFParseError("Pages tree not found");
      }

      const kids = pagesTree.Kids as PDFArray;
      const pages: ParsedPDFPage[] = [];

      for (const kidRef of kids) {
         if (typeof kidRef === "object" && "objectNumber" in kidRef) {
            const page = this.parsePage(kidRef as PDFRef);
            if (page) pages.push(page);
         }
      }

      return pages;
   }

   /**
    * Parse a single page
    */
   private parsePage(ref: PDFRef): ParsedPDFPage | null {
      const pageDict = this.objects.get(ref.objectNumber) as PDFDictionary;
      if (!pageDict) return null;

      const mediaBox = pageDict.MediaBox as PDFArray;
      const size = {
         width: mediaBox[2] as number,
         height: mediaBox[3] as number,
      };

      // Extract content
      let content = "";
      const contentsRef = pageDict.Contents as PDFRef;
      if (contentsRef && typeof contentsRef === "object" && "objectNumber" in contentsRef) {
         content = this.extractText(contentsRef);
      }

      return { ref, size, content };
   }

   /**
    * Extract text from content stream
    */
   private extractText(ref: PDFRef): string {
      const stream = this.objects.get(ref.objectNumber);
      if (!stream || !stream.data) return "";

      const decoder = new TextDecoder();
      const content = decoder.decode(stream.data);

      // Simple text extraction - look for (text) Tj patterns
      const texts: string[] = [];
      const regex = /\(([^)]*)\)\s*Tj/g;
      let match;
      while ((match = regex.exec(content)) !== null) {
         texts.push(match[1]);
      }

      return texts.join(" ");
   }
}
