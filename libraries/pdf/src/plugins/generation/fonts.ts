/**
 * PDF Standard 14 Fonts
 * These fonts are guaranteed to be available in all PDF readers
 */
export const STANDARD_FONTS = {
   // Serif fonts
   "Times-Roman": "Times-Roman",
   "Times-Bold": "Times-Bold",
   "Times-Italic": "Times-Italic",
   "Times-BoldItalic": "Times-BoldItalic",

   // Sans-serif fonts
   Helvetica: "Helvetica",
   "Helvetica-Bold": "Helvetica-Bold",
   "Helvetica-Oblique": "Helvetica-Oblique",
   "Helvetica-BoldOblique": "Helvetica-BoldOblique",

   // Monospace fonts
   Courier: "Courier",
   "Courier-Bold": "Courier-Bold",
   "Courier-Oblique": "Courier-Oblique",
   "Courier-BoldOblique": "Courier-BoldOblique",

   // Symbol fonts
   Symbol: "Symbol",
   ZapfDingbats: "ZapfDingbats",
} as const;

export type StandardFont = keyof typeof STANDARD_FONTS;

/**
 * Font families for convenience
 */
export const FONT_FAMILIES = {
   times: {
      regular: "Times-Roman" as StandardFont,
      bold: "Times-Bold" as StandardFont,
      italic: "Times-Italic" as StandardFont,
      boldItalic: "Times-BoldItalic" as StandardFont,
   },
   helvetica: {
      regular: "Helvetica" as StandardFont,
      bold: "Helvetica-Bold" as StandardFont,
      oblique: "Helvetica-Oblique" as StandardFont,
      boldOblique: "Helvetica-BoldOblique" as StandardFont,
   },
   courier: {
      regular: "Courier" as StandardFont,
      bold: "Courier-Bold" as StandardFont,
      oblique: "Courier-Oblique" as StandardFont,
      boldOblique: "Courier-BoldOblique" as StandardFont,
   },
   symbol: {
      regular: "Symbol" as StandardFont,
   },
   zapfDingbats: {
      regular: "ZapfDingbats" as StandardFont,
   },
};

/**
 * Check if a font is a standard PDF font
 */
export function isStandardFont(font: string): font is StandardFont {
   return font in STANDARD_FONTS;
}

/**
 * Get font object reference name
 */
export function getFontRefName(font: StandardFont): string {
   return `F${Object.keys(STANDARD_FONTS).indexOf(font) + 1}`;
}
