/**
 * PDF token types
 */
export enum TokenType {
   // Primitives
   NUMBER = "NUMBER",
   STRING = "STRING",
   NAME = "NAME",
   BOOLEAN = "BOOLEAN",
   NULL = "NULL",

   // Delimiters
   ARRAY_START = "ARRAY_START",     // [
   ARRAY_END = "ARRAY_END",         // ]
   DICT_START = "DICT_START",       // <<
   DICT_END = "DICT_END",           // >>

   // Keywords
   OBJ = "OBJ",                     // obj
   ENDOBJ = "ENDOBJ",               // endobj
   STREAM = "STREAM",               // stream
   ENDSTREAM = "ENDSTREAM",         // endstream
   XREF = "XREF",                   // xref
   TRAILER = "TRAILER",             // trailer
   STARTXREF = "STARTXREF",         // startxref
   R = "R",                         // R (reference)

   // Special
   EOF = "EOF",
}

/**
 * PDF token
 */
export interface Token {
   type: TokenType;
   value: any;
   position: number;
}

/**
 * PDF Lexer
 */
export class PDFLexer {
   private data: Uint8Array;
   private position: number = 0;

   constructor(data: Uint8Array) {
      this.data = data;
   }

   /**
    * Get next token
    */
   nextToken(): Token {
      this.skipWhitespace();

      if (this.position >= this.data.length) {
         return { type: TokenType.EOF, value: null, position: this.position };
      }

      const char = String.fromCharCode(this.data[this.position]);

      // Delimiters
      if (char === "[") {
         this.position++;
         return { type: TokenType.ARRAY_START, value: "[", position: this.position - 1 };
      }
      if (char === "]") {
         this.position++;
         return { type: TokenType.ARRAY_END, value: "]", position: this.position - 1 };
      }
      if (char === "<" && this.peek() === "<") {
         this.position += 2;
         return { type: TokenType.DICT_START, value: "<<", position: this.position - 2 };
      }
      if (char === ">" && this.peek() === ">") {
         this.position += 2;
         return { type: TokenType.DICT_END, value: ">>", position: this.position - 2 };
      }

      // Name (starts with /)
      if (char === "/") {
         return this.readName();
      }

      // String (starts with ()
      if (char === "(") {
         return this.readString();
      }

      // Number or keyword
      if (char === "-" || char === "+" || char === "." || (char >= "0" && char <= "9")) {
         return this.readNumber();
      }

      // Keyword or boolean
      return this.readKeyword();
   }

   /**
    * Peek at next character without consuming
    */
   private peek(): string {
      if (this.position + 1 >= this.data.length) return "";
      return String.fromCharCode(this.data[this.position + 1]);
   }

   /**
    * Skip whitespace and comments
    */
   private skipWhitespace(): void {
      while (this.position < this.data.length) {
         const char = this.data[this.position];

         // Whitespace
         if (char === 0x20 || char === 0x09 || char === 0x0A || char === 0x0D || char === 0x00) {
            this.position++;
            continue;
         }

         // Comment (starts with %)
         if (char === 0x25) {
            while (this.position < this.data.length && this.data[this.position] !== 0x0A && this.data[this.position] !== 0x0D) {
               this.position++;
            }
            continue;
         }

         break;
      }
   }

   /**
    * Read a name token
    */
   private readName(): Token {
      const start = this.position;
      this.position++; // Skip /

      let value = "";
      while (this.position < this.data.length) {
         const char = String.fromCharCode(this.data[this.position]);
         if (this.isDelimiter(char) || this.isWhitespace(this.data[this.position])) {
            break;
         }
         value += char;
         this.position++;
      }

      return { type: TokenType.NAME, value, position: start };
   }

   /**
    * Read a string token
    */
   private readString(): Token {
      const start = this.position;
      this.position++; // Skip (

      let value = "";
      let depth = 1;

      while (this.position < this.data.length && depth > 0) {
         const char = String.fromCharCode(this.data[this.position]);

         if (char === "\\") {
            // Escape sequence
            this.position++;
            if (this.position < this.data.length) {
               const escaped = String.fromCharCode(this.data[this.position]);
               value += escaped === "n" ? "\n" : escaped === "r" ? "\r" : escaped === "t" ? "\t" : escaped;
            }
         } else if (char === "(") {
            depth++;
            value += char;
         } else if (char === ")") {
            depth--;
            if (depth > 0) value += char;
         } else {
            value += char;
         }

         this.position++;
      }

      return { type: TokenType.STRING, value, position: start };
   }

   /**
    * Read a number token
    */
   private readNumber(): Token {
      const start = this.position;
      let value = "";

      while (this.position < this.data.length) {
         const char = String.fromCharCode(this.data[this.position]);
         if (char === "-" || char === "+" || char === "." || (char >= "0" && char <= "9")) {
            value += char;
            this.position++;
         } else {
            break;
         }
      }

      return { type: TokenType.NUMBER, value: value.includes(".") ? parseFloat(value) : parseInt(value, 10), position: start };
   }

   /**
    * Read a keyword token
    */
   private readKeyword(): Token {
      const start = this.position;
      let value = "";

      while (this.position < this.data.length) {
         const char = String.fromCharCode(this.data[this.position]);
         if (this.isDelimiter(char) || this.isWhitespace(this.data[this.position])) {
            break;
         }
         value += char;
         this.position++;
      }

      // Check for keywords
      const upper = value.toUpperCase();
      if (upper === "OBJ") return { type: TokenType.OBJ, value, position: start };
      if (upper === "ENDOBJ") return { type: TokenType.ENDOBJ, value, position: start };
      if (upper === "STREAM") return { type: TokenType.STREAM, value, position: start };
      if (upper === "ENDSTREAM") return { type: TokenType.ENDSTREAM, value, position: start };
      if (upper === "XREF") return { type: TokenType.XREF, value, position: start };
      if (upper === "TRAILER") return { type: TokenType.TRAILER, value, position: start };
      if (upper === "STARTXREF") return { type: TokenType.STARTXREF, value, position: start };
      if (upper === "R") return { type: TokenType.R, value, position: start };
      if (upper === "TRUE") return { type: TokenType.BOOLEAN, value: true, position: start };
      if (upper === "FALSE") return { type: TokenType.BOOLEAN, value: false, position: start };
      if (upper === "NULL") return { type: TokenType.NULL, value: null, position: start };

      // Unknown keyword - treat as name without /
      return { type: TokenType.NAME, value, position: start };
   }

   /**
    * Check if character is delimiter
    */
   private isDelimiter(char: string): boolean {
      return ["(", ")", "<", ">", "[", "]", "{", "}", "/", "%"].includes(char);
   }

   /**
    * Check if byte is whitespace
    */
   private isWhitespace(byte: number): boolean {
      return byte === 0x20 || byte === 0x09 || byte === 0x0A || byte === 0x0D || byte === 0x00;
   }
}
