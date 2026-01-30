import type { PDFRef, PDFDictionary, PageSize } from "../types.ts";
import {
   createDictionary,
   createName,
   createArray,
   createRef,
} from "../core/objects.ts";
import { PageSizeSchema } from "../schemas.ts";

export type PDFPageOptions = {
   size?: PageSize;
   parent?: PDFRef;
};

// Standard page sizes in points (1/72 inch)
const PAGE_SIZES = {
   A4: { width: 595, height: 842 },
   Letter: { width: 612, height: 792 },
   Legal: { width: 612, height: 1008 },
   A3: { width: 842, height: 1191 },
   A5: { width: 420, height: 595 },
   Tabloid: { width: 792, height: 1224 },
};

/**
 * PDF Page class
 */
export class PDFPage {
   ref: PDFRef;
   size: PageSize;
   parent?: PDFRef;
   contentStream: string[] = [];
   private resources: PDFDictionary;

   constructor(ref: PDFRef, options: PDFPageOptions = {}) {
      this.ref = ref;
      this.size = PageSizeSchema.parse(options.size ?? "A4");
      this.parent = options.parent;
      this.resources = createDictionary({
         Font: createDictionary(),
      });
   }

   /**
    * Get page dimensions in points
    */
   getDimensions(): { width: number; height: number } {
      if (typeof this.size === "string") {
         return PAGE_SIZES[this.size];
      }
      return this.size;
   }

   /**
    * Convert page to PDF dictionary
    */
   toDictionary(): PDFDictionary {
      const dims = this.getDimensions();
      const dict = createDictionary({
         Type: createName("Page"),
         MediaBox: createArray([0, 0, dims.width, dims.height]),
         Contents: createRef(this.ref.objectNumber + 1, 0), // Placeholder
         Resources: this.resources,
      });

      if (this.parent) {
         dict.Parent = this.parent;
      }

      return dict;
   }
}
