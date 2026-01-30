import type { PDFRef, PDFDictionary, PageSize, TextOptions } from "../types.ts";
import {
   createDictionary,
   createName,
   createArray,
   createRef,
} from "../core/objects.ts";
import { PageSizeSchema, TextOptionsSchema } from "../schemas.ts";

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
    * Draw text on the page
    */
   drawText(text: string, options: TextOptions): void {
      const validOptions = TextOptionsSchema.parse(options);
      const { x, y, size = 12, font = "Helvetica", color, align = "left" } = validOptions;

      // Register font in resources
      const fontDict = this.resources.Font as PDFDictionary;
      if (!fontDict[font]) {
         fontDict[font] = createName(font);
      }

      // Calculate text position based on alignment
      let xPos = x;
      if (align === "center") {
         // Approximate centering (proper calculation needs font metrics)
         xPos = x - (text.length * size * 0.3);
      } else if (align === "right") {
         xPos = x - (text.length * size * 0.6);
      }

      // Set color if provided
      if (color) {
         if (color.type === "rgb") {
            this.contentStream.push(`${color.r} ${color.g} ${color.b} rg`);
         } else if (color.type === "cmyk") {
            this.contentStream.push(
               `${color.c} ${color.m} ${color.y} ${color.k} k`,
            );
         } else if (color.type === "gray") {
            this.contentStream.push(`${color.gray} g`);
         }
      }

      // Draw text
      this.contentStream.push("BT"); // Begin text
      this.contentStream.push(`/${font} ${size} Tf`); // Set font and size
      this.contentStream.push(`${xPos} ${y} Td`); // Position
      
      // Escape special characters in text
      const escapedText = text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
      this.contentStream.push(`(${escapedText}) Tj`); // Show text
      this.contentStream.push("ET"); // End text
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
