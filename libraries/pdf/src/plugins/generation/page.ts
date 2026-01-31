import type { PDFRef, PDFDictionary, PageSize, TextOptions, RectOptions, LineOptions, PDFColor, PDFStream } from "../../types.ts";
import {
   createDictionary,
   createName,
   createArray,
   createRef,
   createStream,
} from "../../core/objects.ts";
import { PageSizeSchema, TextOptionsSchema, RectOptionsSchema, LineOptionsSchema } from "../../schemas.ts";
import { STANDARD_FONTS, isStandardFont, getFontRefName, type StandardFont } from "./fonts.ts";

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
    * Set fill color
    */
   private setFillColor(color: PDFColor): void {
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

   /**
    * Set stroke color
    */
   private setStrokeColor(color: PDFColor): void {
      if (color.type === "rgb") {
         this.contentStream.push(`${color.r} ${color.g} ${color.b} RG`);
      } else if (color.type === "cmyk") {
         this.contentStream.push(
            `${color.c} ${color.m} ${color.y} ${color.k} K`,
         );
      } else if (color.type === "gray") {
         this.contentStream.push(`${color.gray} G`);
      }
   }

   /**
    * Draw text on the page
    */
   drawText(text: string, options: TextOptions): void {
      const validOptions = TextOptionsSchema.parse(options);
      const { x, y, size = 12, font = "Helvetica", color, align = "left" } = validOptions;

      // Register font in resources
      const fontName = font || "Helvetica";
      if (!isStandardFont(fontName)) {
         throw new Error(
            `Font "${fontName}" is not a standard PDF font. Use one of: ${Object.keys(STANDARD_FONTS).join(", ")}`,
         );
      }

      const fontRefName = getFontRefName(fontName);
      const fontDict = this.resources.Font as PDFDictionary;
      if (!fontDict[fontRefName]) {
         // Create font object
         const fontObj = createDictionary({
            Type: createName("Font"),
            Subtype: createName("Type1"),
            BaseFont: createName(fontName),
         });
         fontDict[fontRefName] = fontObj;
      }

      // Calculate text position based on alignment
      let xPos = x;
      if (align === "center") {
         // Approximate centering (proper calculation needs font metrics)
         xPos = x - text.length * size * 0.3;
      } else if (align === "right") {
         xPos = x - text.length * size * 0.6;
      }

      // Set color if provided
      if (color) {
         this.setFillColor(color);
      }

      // Draw text
      this.contentStream.push("BT"); // Begin text
      this.contentStream.push(`/${fontRefName} ${size} Tf`); // Set font and size
      this.contentStream.push(`${xPos} ${y} Td`); // Position

      // Escape special characters in text
      const escapedText = text
         .replace(/\\/g, "\\\\")
         .replace(/\(/g, "\\(")
         .replace(/\)/g, "\\)");
      this.contentStream.push(`(${escapedText}) Tj`); // Show text
      this.contentStream.push("ET"); // End text
   }

   /**
    * Draw a rectangle
    */
   drawRectangle(options: RectOptions): void {
      const validOptions = RectOptionsSchema.parse(options);
      const { x, y, width, height, fill, stroke, lineWidth = 1 } = validOptions;

      // Set graphics state
      if (lineWidth && stroke) {
         this.contentStream.push(`${lineWidth} w`);
      }

      if (fill) {
         this.setFillColor(fill);
      }

      if (stroke) {
         this.setStrokeColor(stroke);
      }

      // Draw rectangle
      this.contentStream.push(`${x} ${y} ${width} ${height} re`);

      // Fill, stroke, or both
      if (fill && stroke) {
         this.contentStream.push("B"); // Fill and stroke
      } else if (fill) {
         this.contentStream.push("f"); // Fill only
      } else if (stroke) {
         this.contentStream.push("S"); // Stroke only
      } else {
         this.contentStream.push("S"); // Default to stroke
      }
   }

   /**
    * Draw a line
    */
   drawLine(options: LineOptions): void {
      const validOptions = LineOptionsSchema.parse(options);
      const { x1, y1, x2, y2, color, lineWidth = 1 } = validOptions;

      // Set graphics state
      if (lineWidth) {
         this.contentStream.push(`${lineWidth} w`);
      }

      if (color) {
         this.setStrokeColor(color);
      }

      // Draw line
      this.contentStream.push(`${x1} ${y1} m`); // Move to start
      this.contentStream.push(`${x2} ${y2} l`); // Line to end
      this.contentStream.push("S"); // Stroke
   }

   /**
    * Get content stream reference
    */
   getContentStreamRef(): PDFRef {
      // Content stream ref is page ref + 1
      return createRef(this.ref.objectNumber + 1, 0);
   }

   /**
    * Generate content stream as PDFStream
    */
   toContentStream(): PDFStream {
      const content = this.contentStream.join("\n");
      const data = new TextEncoder().encode(content);
      
      const dict = createDictionary({
         Length: data.length,
      });

      return createStream(data, dict);
   }

   /**
    * Convert page to PDF dictionary
    */
   toDictionary(): PDFDictionary {
      const dims = this.getDimensions();
      const dict = createDictionary({
         Type: createName("Page"),
         MediaBox: createArray([0, 0, dims.width, dims.height]),
         Contents: this.getContentStreamRef(),
         Resources: this.resources,
      });

      if (this.parent) {
         dict.Parent = this.parent;
      }

      return dict;
   }
}
