/**
 * PDF object types
 */
export type PDFObjectType =
   | "boolean"
   | "number"
   | "string"
   | "name"
   | "array"
   | "dictionary"
   | "stream"
   | "null"
   | "indirect";

/**
 * PDF reference to indirect object
 */
export type PDFRef = {
   readonly objectNumber: number;
   readonly generation: number;
};

/**
 * PDF indirect object
 */
export type PDFIndirectObject = {
   ref: PDFRef;
   value: PDFValue;
};

/**
 * PDF value types
 */
export type PDFValue =
   | boolean
   | number
   | string
   | PDFName
   | PDFArray
   | PDFDictionary
   | PDFStream
   | null
   | PDFRef;

/**
 * PDF Name object
 */
export type PDFName = {
   readonly type: "name";
   readonly value: string;
};

/**
 * PDF Array
 */
export type PDFArray = PDFValue[];

/**
 * PDF Dictionary
 */
export type PDFDictionary = Record<string, PDFValue>;

/**
 * PDF Stream
 */
export type PDFStream = {
   readonly dictionary: PDFDictionary;
   readonly data: Uint8Array;
};

/**
 * PDF Page size presets
 */
export type PageSize =
   | "A4"
   | "Letter"
   | "Legal"
   | "A3"
   | "A5"
   | "Tabloid"
   | { width: number; height: number };

/**
 * PDF Color
 */
export type PDFColor =
   | { type: "rgb"; r: number; g: number; b: number }
   | { type: "cmyk"; c: number; m: number; y: number; k: number }
   | { type: "gray"; gray: number };

/**
 * Text options
 */
export type TextOptions = {
   x: number;
   y: number;
   size?: number;
   font?: string;
   color?: PDFColor;
   align?: "left" | "center" | "right";
};

/**
 * Rectangle options
 */
export type RectOptions = {
   x: number;
   y: number;
   width: number;
   height: number;
   fill?: PDFColor;
   stroke?: PDFColor;
   lineWidth?: number;
};

/**
 * Line options
 */
export type LineOptions = {
   x1: number;
   y1: number;
   x2: number;
   y2: number;
   color?: PDFColor;
   lineWidth?: number;
};

/**
 * PDF metadata
 */
export type PDFMetadata = {
   title?: string;
   author?: string;
   subject?: string;
   keywords?: string[];
   creator?: string;
   producer?: string;
   creationDate?: Date;
   modificationDate?: Date;
};

/**
 * PDF version
 */
export type PDFVersion = "1.4" | "1.5" | "1.6" | "1.7";
