import { describe, expect, test } from "bun:test";
import { PDFLexer, TokenType } from "./lexer.ts";

describe("PDFLexer", () => {
   test("tokenizes numbers", () => {
      const lexer = new PDFLexer(new TextEncoder().encode("123 -45 3.14"));
      expect(lexer.nextToken()).toEqual({ type: TokenType.NUMBER, value: 123, position: 0 });
      expect(lexer.nextToken()).toEqual({ type: TokenType.NUMBER, value: -45, position: 4 });
      expect(lexer.nextToken()).toEqual({ type: TokenType.NUMBER, value: 3.14, position: 8 });
   });

   test("tokenizes strings", () => {
      const lexer = new PDFLexer(new TextEncoder().encode("(Hello World)"));
      const token = lexer.nextToken();
      expect(token.type).toBe(TokenType.STRING);
      expect(token.value).toBe("Hello World");
   });

   test("tokenizes names", () => {
      const lexer = new PDFLexer(new TextEncoder().encode("/Type /Page"));
      expect(lexer.nextToken()).toEqual({ type: TokenType.NAME, value: "Type", position: 0 });
      expect(lexer.nextToken()).toEqual({ type: TokenType.NAME, value: "Page", position: 6 });
   });

   test("tokenizes booleans and null", () => {
      const lexer = new PDFLexer(new TextEncoder().encode("true false null"));
      expect(lexer.nextToken()).toEqual({ type: TokenType.BOOLEAN, value: true, position: 0 });
      expect(lexer.nextToken()).toEqual({ type: TokenType.BOOLEAN, value: false, position: 5 });
      expect(lexer.nextToken()).toEqual({ type: TokenType.NULL, value: null, position: 11 });
   });

   test("tokenizes delimiters", () => {
      const lexer = new PDFLexer(new TextEncoder().encode("[ ] << >>"));
      expect(lexer.nextToken().type).toBe(TokenType.ARRAY_START);
      expect(lexer.nextToken().type).toBe(TokenType.ARRAY_END);
      expect(lexer.nextToken().type).toBe(TokenType.DICT_START);
      expect(lexer.nextToken().type).toBe(TokenType.DICT_END);
   });

   test("tokenizes keywords", () => {
      const lexer = new PDFLexer(new TextEncoder().encode("obj endobj stream endstream xref trailer startxref R"));
      expect(lexer.nextToken().type).toBe(TokenType.OBJ);
      expect(lexer.nextToken().type).toBe(TokenType.ENDOBJ);
      expect(lexer.nextToken().type).toBe(TokenType.STREAM);
      expect(lexer.nextToken().type).toBe(TokenType.ENDSTREAM);
      expect(lexer.nextToken().type).toBe(TokenType.XREF);
      expect(lexer.nextToken().type).toBe(TokenType.TRAILER);
      expect(lexer.nextToken().type).toBe(TokenType.STARTXREF);
      expect(lexer.nextToken().type).toBe(TokenType.R);
   });

   test("skips whitespace", () => {
      const lexer = new PDFLexer(new TextEncoder().encode("  123  \n  456  "));
      expect(lexer.nextToken().value).toBe(123);
      expect(lexer.nextToken().value).toBe(456);
   });

   test("skips comments", () => {
      const lexer = new PDFLexer(new TextEncoder().encode("%Comment\n123"));
      expect(lexer.nextToken().value).toBe(123);
   });

   test("returns EOF at end", () => {
      const lexer = new PDFLexer(new TextEncoder().encode("123"));
      lexer.nextToken();
      expect(lexer.nextToken().type).toBe(TokenType.EOF);
   });
});
