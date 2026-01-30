import {
   createArray,
   createDictionary,
   createName,
   createRef,
} from "../core/objects.ts";
import { PDFMetadataSchema, PDFVersionSchema } from "../schemas.ts";
import type {
   PDFMetadata,
   PDFRef,
   PDFVersion,
} from "../types.ts";

export type PDFDocumentOptions = {
   version?: PDFVersion;
   metadata?: PDFMetadata;
};

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
   private objects: Map<number, PDFDictionary> = new Map();
   private nextObjectNumber = 1;

   catalog: PDFRef;
   pages: PDFRef;

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
         const infoDict = createDictionary({ ...this.metadata });
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
    * Save PDF to bytes
    */
   save(): Uint8Array {
      // For now, just return header
      const header = `%PDF-${this.version}\n`;
      return new TextEncoder().encode(header);
   }
}
