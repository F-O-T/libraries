/**
 * Base error class for all PDF errors
 */
export class PDFError extends Error {
   constructor(message: string) {
      super(message);
      this.name = "PDFError";
      if (Error.captureStackTrace) {
         Error.captureStackTrace(this, this.constructor);
      }
   }
}

/**
 * Error thrown when PDF parsing fails
 */
export class PDFParseError extends PDFError {
   constructor(
      message: string,
      public readonly offset?: number,
   ) {
      super(message);
      this.name = "PDFParseError";
   }
}

/**
 * Error thrown when PDF generation fails
 */
export class PDFGenerationError extends PDFError {
   constructor(message: string) {
      super(message);
      this.name = "PDFGenerationError";
   }
}

/**
 * Error thrown when PDF object is invalid
 */
export class InvalidPDFObjectError extends PDFError {
   constructor(
      public readonly objectType: string,
      reason: string,
   ) {
      super(`Invalid ${objectType}: ${reason}`);
      this.name = "InvalidPDFObjectError";
   }
}

/**
 * Error thrown when font is not found
 */
export class FontNotFoundError extends PDFError {
   constructor(public readonly fontName: string) {
      super(`Font not found: ${fontName}`);
      this.name = "FontNotFoundError";
   }
}

/**
 * Error thrown when image is invalid
 */
export class InvalidImageError extends PDFError {
   constructor(reason: string) {
      super(`Invalid image: ${reason}`);
      this.name = "InvalidImageError";
   }
}

/**
 * Error thrown when PDF signature fails
 */
export class PDFSignatureError extends PDFError {
   constructor(reason: string) {
      super(`PDF signature error: ${reason}`);
      this.name = "PDFSignatureError";
   }
}

/**
 * Error thrown when PDF encryption fails
 */
export class PDFEncryptionError extends PDFError {
   constructor(reason: string) {
      super(`PDF encryption error: ${reason}`);
      this.name = "PDFEncryptionError";
   }
}

/**
 * Error thrown when required feature is not implemented
 */
export class NotImplementedError extends PDFError {
   constructor(feature: string) {
      super(`Feature not yet implemented: ${feature}`);
      this.name = "NotImplementedError";
   }
}
