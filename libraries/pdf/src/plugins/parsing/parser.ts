// @ts-nocheck
import { PDFLexer, TokenType, type Token } from "./lexer.ts";
import type { PDFValue, PDFDictionary, PDFArray, PDFRef, PDFStream } from "../../types.ts";
import { createDictionary, createArray, createRef, createName, createStream } from "../../core/objects.ts";

/**
 * PDF Parser
 */
export class PDFParser {
   private lexer: PDFLexer;
   private currentToken: Token;
   private nextToken: Token | null = null;
   private data: Uint8Array;

   constructor(data: Uint8Array) {
      this.data = data;
      this.lexer = new PDFLexer(data);
      this.currentToken = this.lexer.nextToken();
   }

   /**
    * Parse a PDF value
    */
   parseValue(): PDFValue {
      switch (this.currentToken.type) {
         case TokenType.NUMBER:
            return this.parseNumberOrRef();
         case TokenType.STRING:
            return this.parseString();
         case TokenType.NAME:
            return this.parseName();
         case TokenType.BOOLEAN:
            return this.parseBoolean();
         case TokenType.NULL:
            return this.parseNull();
         case TokenType.ARRAY_START:
            return this.parseArray();
         case TokenType.DICT_START:
            return this.parseDictionary();
         default:
            throw new Error(`Unexpected token: ${this.currentToken.type}`);
      }
   }

   /**
    * Parse number or reference (number number R)
    */
   private parseNumberOrRef(): number | PDFRef {
      const first = this.currentToken.value as number;
      this.advance();

      // Check if this is a reference (two numbers followed by R)
      if (this.currentToken.type === TokenType.NUMBER) {
         const second = this.currentToken.value as number;
         this.advance();

         if ((this.currentToken.type as any) === TokenType.R) {
            this.advance();
            return createRef(first, second);
         }

         // Not a reference - we consumed the second number, need to put it back
         // Put the current token (third token) into nextToken buffer
         // Then restore second number as current token
         const thirdToken = this.currentToken;
         this.currentToken = { type: TokenType.NUMBER, value: second, position: 0 };
         this.nextToken = thirdToken;
         return first;
      }

      return first;
   }

   /**
    * Parse string
    */
   private parseString(): string {
      const value = this.currentToken.value as string;
      this.advance();
      return value;
   }

   /**
    * Parse name
    */
   private parseName(): PDFValue {
      const value = this.currentToken.value as string;
      this.advance();
      return createName(value);
   }

   /**
    * Parse boolean
    */
   private parseBoolean(): boolean {
      const value = this.currentToken.value as boolean;
      this.advance();
      return value;
   }

   /**
    * Parse null
    */
   private parseNull(): null {
      this.advance();
      return null;
   }

   /**
    * Parse array
    */
   private parseArray(): PDFArray {
      this.advance(); // Skip [
      const values: PDFValue[] = [];

      while (this.currentToken.type !== TokenType.ARRAY_END) {
         if (this.currentToken.type === TokenType.EOF) {
            throw new Error("Unexpected EOF in array");
         }
         values.push(this.parseValue());
      }

      this.advance(); // Skip ]
      return createArray(values);
   }

   /**
    * Parse dictionary
    */
   private parseDictionary(): PDFDictionary {
      this.advance(); // Skip <<
      const entries: Record<string, PDFValue> = {};

      while (this.currentToken.type !== TokenType.DICT_END) {
         if (this.currentToken.type === TokenType.EOF) {
            throw new Error("Unexpected EOF in dictionary");
         }

         // Key must be a name
         if (this.currentToken.type !== TokenType.NAME) {
            throw new Error(`Expected name in dictionary, got ${this.currentToken.type}`);
         }
         const key = this.currentToken.value as string;
         this.advance();

         // Value
         const value = this.parseValue();
         entries[key] = value;
      }

      this.advance(); // Skip >>
      return createDictionary(entries);
   }

   /**
    * Parse indirect object
    */
   parseIndirectObject(): { ref: PDFRef; value: PDFValue } {
      // Parse: objectNumber generation obj
      if (this.currentToken.type !== TokenType.NUMBER) {
         throw new Error("Expected object number");
      }
      const objectNumber = this.currentToken.value as number;
      this.advance();

      if (this.currentToken.type !== TokenType.NUMBER) {
         throw new Error("Expected generation number");
      }
      const generation = this.currentToken.value as number;
      this.advance();

      if ((this.currentToken.type as any) !== TokenType.OBJ) {
         throw new Error("Expected 'obj' keyword");
      }
      this.advance();

      // Parse object value
      let value: PDFValue = this.parseValue();

      // Check for stream
      if (this.currentToken.type === TokenType.STREAM) {
         value = this.parseStream(value as PDFDictionary);
      }

      // Expect endobj
      if (this.currentToken.type !== TokenType.ENDOBJ) {
         throw new Error("Expected 'endobj' keyword");
      }
      this.advance();

      return {
         ref: createRef(objectNumber, generation),
         value,
      };
   }

   /**
    * Parse stream (dictionary already parsed)
    */
   private parseStream(dictionary: PDFDictionary): PDFStream {
      // Get current position where 'stream' keyword is
      const streamKeywordPos = this.currentToken.position;
      this.advance(); // Skip 'stream'

      // Find the actual start of stream data (after 'stream' keyword and newline)
      // The stream keyword is followed by either \n or \r\n
      let streamDataStart = streamKeywordPos + 6; // 'stream' is 6 characters
      
      // Skip the newline after 'stream'
      while (streamDataStart < this.data.length) {
         const byte = this.data[streamDataStart];
         if (byte === 0x0D || byte === 0x0A) { // \r or \n
            streamDataStart++;
            // Handle \r\n
            if (byte === 0x0D && this.data[streamDataStart] === 0x0A) {
               streamDataStart++;
            }
            break;
         }
         streamDataStart++;
      }

      // Get stream length — may be a direct number or an indirect reference
      const lengthVal = dictionary.Length;
      let data: Uint8Array;

      if (typeof lengthVal === "number") {
         // Direct length: slice exactly
         data = this.data.slice(streamDataStart, streamDataStart + lengthVal);
      } else {
         // Indirect reference or missing — scan raw bytes for 'endstream' marker
         // instead of tokenizing binary data (which freezes the lexer)
         const marker = new TextEncoder().encode("endstream");
         let endPos = streamDataStart;
         while (endPos < this.data.length - marker.length) {
            if (this.data[endPos] === marker[0]) {
               let match = true;
               for (let j = 1; j < marker.length; j++) {
                  if (this.data[endPos + j] !== marker[j]) { match = false; break; }
               }
               if (match) break;
            }
            endPos++;
         }
         // Trim trailing whitespace (\r\n or \n before endstream)
         let dataEnd = endPos;
         if (dataEnd > streamDataStart && this.data[dataEnd - 1] === 0x0A) dataEnd--;
         if (dataEnd > streamDataStart && this.data[dataEnd - 1] === 0x0D) dataEnd--;
         data = this.data.slice(streamDataStart, dataEnd);
      }

      // Skip past stream data — create a new lexer starting after the stream
      // to avoid tokenizing binary content byte-by-byte
      const afterStream = streamDataStart + data.length;
      this.lexer = new PDFLexer(this.data.subarray(afterStream));
      this.currentToken = this.lexer.nextToken();

      // Skip any whitespace tokens until we hit endstream
      while (this.currentToken.type !== TokenType.ENDSTREAM && this.currentToken.type !== TokenType.EOF) {
         this.advance();
      }

      if (this.currentToken.type !== TokenType.ENDSTREAM) {
         throw new Error("Expected 'endstream' keyword");
      }
      this.advance();

      return createStream(data, dictionary);
   }

   /**
    * Advance to next token
    */
   private advance(): void {
      if (this.nextToken !== null) {
         this.currentToken = this.nextToken;
         this.nextToken = null;
      } else {
         this.currentToken = this.lexer.nextToken();
      }
   }

   /**
    * Check if more tokens available
    */
   hasMore(): boolean {
      return this.currentToken.type !== TokenType.EOF;
   }
}
