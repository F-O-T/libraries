import {
   createArray,
   createDictionary,
   createName,
   createRef,
} from "../../core/objects.ts";
import { PDFMetadataSchema, PDFVersionSchema } from "../../schemas.ts";
import type { PDFMetadata, PDFRef, PDFVersion, PDFDictionary, PDFStream } from "../../types.ts";
import { PDFPage } from "./page.ts";
import { serializeValue, serializeObject } from "./writer.ts";

export type PDFDocumentOptions = {
   version?: PDFVersion;
   metadata?: PDFMetadata;
};

export type { PDFPageOptions } from "./page.ts";

/**
 * Main PDF Document class for generation
 *
 * @property version - PDF version (1.4, 1.5, 1.6, or 1.7)
 * @property metadata - Document metadata (title, author, etc.)
 * @property catalog - Reference to the document catalog
 * @property pages - Reference to the pages tree root
 */
export class PDFDocument {
   version: PDFVersion;
   metadata: PDFMetadata;
   private objects: Map<number, PDFDictionary | PDFStream> = new Map();
   private nextObjectNumber = 1;

   catalog: PDFRef;
   pages: PDFRef;
   private pagesArray: PDFPage[] = [];

   constructor(options: PDFDocumentOptions = {}) {
      this.version = PDFVersionSchema.parse(options.version ?? "1.7");
      this.metadata = PDFMetadataSchema.parse(options.metadata ?? {});

      // Create catalog
      this.catalog = this.allocateRef();

      // Create pages tree
      this.pages = this.allocateRef();

      // Initialize catalog dictionary
      const catalogDict = createDictionary({
         Type: createName("Catalog"),
         Pages: this.pages,
      });
      this.objects.set(this.catalog.objectNumber, catalogDict);

      // Initialize pages dictionary
      const pagesDict = createDictionary({
         Type: createName("Pages"),
         Kids: createArray([]),
         Count: 0,
      });
      this.objects.set(this.pages.objectNumber, pagesDict);

      // Store metadata if provided (will be serialized in future tasks)
      if (Object.keys(this.metadata).length > 0) {
         const infoRef = this.allocateRef();
         const metadataDict: Record<string, string | number> = {};
         if (this.metadata.title) metadataDict.Title = this.metadata.title;
         if (this.metadata.author) metadataDict.Author = this.metadata.author;
         if (this.metadata.subject) metadataDict.Subject = this.metadata.subject;
         if (this.metadata.creator) metadataDict.Creator = this.metadata.creator;
         if (this.metadata.producer) metadataDict.Producer = this.metadata.producer;
         const infoDict = createDictionary(metadataDict);
         this.objects.set(infoRef.objectNumber, infoDict);
      }
   }

   /**
    * Allocate a new object reference
    */
   private allocateRef(): PDFRef {
      return createRef(this.nextObjectNumber++, 0);
   }

   /**
    * Add a page to the document
    */
   addPage(options?: import("./page.ts").PDFPageOptions): PDFPage {
      const pageRef = this.allocateRef();
      const contentStreamRef = this.allocateRef(); // Allocate content stream ref
      
      const page = new PDFPage(pageRef, { ...options, parent: this.pages });
      this.pagesArray.push(page);

      // Update pages dictionary
      const pagesDict = this.objects.get(
         this.pages.objectNumber,
      ) as PDFDictionary;
      const kids = pagesDict.Kids as PDFRef[];
      kids.push(pageRef);
      pagesDict.Count = (pagesDict.Count as number) + 1;

      // Store page dictionary
      this.objects.set(pageRef.objectNumber, page.toDictionary());

      // Store content stream
      this.objects.set(contentStreamRef.objectNumber, page.toContentStream());

      return page;
   }

   /**
    * Save PDF to bytes
    */
   save(): Uint8Array {
      // Refresh all objects (pages might have changed)
      for (const page of this.pagesArray) {
         this.objects.set(page.ref.objectNumber, page.toDictionary());
         const contentStreamRef = page.getContentStreamRef();
         this.objects.set(contentStreamRef.objectNumber, page.toContentStream());
      }

      const parts: Uint8Array[] = [];

      // 1. PDF Header with binary marker
      const header = new TextEncoder().encode(`%PDF-${this.version}\n%\xE2\xE3\xCF\xD3\n`);
      parts.push(header);

      // 2. Write objects and track byte offsets
      const offsets: number[] = [0]; // Object 0 is always at offset 0
      let currentOffset = header.length;

      // Sort object numbers to write in order
      const objectNumbers = Array.from(this.objects.keys()).sort((a, b) => a - b);

      for (const objNum of objectNumbers) {
         const obj = this.objects.get(objNum);
         const objBytes = serializeObject(objNum, 0, obj);
         parts.push(objBytes);
         offsets[objNum] = currentOffset;
         currentOffset += objBytes.length;
      }

      // 3. Cross-reference table
      const xrefStart = currentOffset;
      const xrefLines = [`xref\n0 ${offsets.length}\n`];

      // Object 0 entry (free)
      xrefLines.push("0000000000 65535 f \n");

      // In-use objects
      for (let i = 1; i < offsets.length; i++) {
         const offset = offsets[i] || 0;
         const offsetStr = offset.toString().padStart(10, "0");
         xrefLines.push(`${offsetStr} 00000 n \n`);
      }

      const xref = new TextEncoder().encode(xrefLines.join(""));
      parts.push(xref);

      // 4. Trailer
      const trailerDict = serializeValue(
         createDictionary({
            Size: offsets.length,
            Root: this.catalog,
         })
      );
      const trailer = new TextEncoder().encode(
         `trailer\n${trailerDict}\nstartxref\n${xrefStart}\n%%EOF\n`
      );
      parts.push(trailer);

      // 5. Combine all parts
      const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
      const result = new Uint8Array(totalLength);
      let position = 0;
      for (const part of parts) {
         result.set(part, position);
         position += part.length;
      }

      return result;
   }
}
