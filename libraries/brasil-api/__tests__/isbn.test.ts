import { describe, expect, test } from "bun:test";
import { BrasilApiValidationError } from "../src/errors";
import { getIsbn } from "../src/isbn";

describe("getIsbn", () => {
   describe("successful API calls", () => {
      test("should return book info for valid ISBN-10", async () => {
         const isbn = "8545702264";
         const book = await getIsbn(isbn);

         expect(book).toHaveProperty("isbn");
         expect(book).toHaveProperty("title");
         expect(typeof book.isbn).toBe("string");
         expect(typeof book.title).toBe("string");
      });

      test("should return book info for valid ISBN-13", async () => {
         const isbn = "9788545702269";
         const book = await getIsbn(isbn);

         expect(book).toHaveProperty("isbn");
         expect(book).toHaveProperty("title");
         expect(typeof book.isbn).toBe("string");
         expect(typeof book.title).toBe("string");
      });

      test("should return book with all required fields", async () => {
         const isbn = "9788545702269";
         const book = await getIsbn(isbn);

         expect(book).toHaveProperty("isbn");
         expect(book).toHaveProperty("title");
         expect(book).toHaveProperty("subtitle");
         expect(book).toHaveProperty("authors");
         expect(book).toHaveProperty("publisher");
         expect(book).toHaveProperty("synopsis");
         expect(book).toHaveProperty("dimensions");
         expect(book).toHaveProperty("year");
         expect(book).toHaveProperty("format");
         expect(book).toHaveProperty("page_count");
         expect(book).toHaveProperty("subjects");
         expect(book).toHaveProperty("location");
         expect(book).toHaveProperty("retail_price");
         expect(book).toHaveProperty("cover_url");
         expect(book).toHaveProperty("provider");
      });

      test("should return authors as array", async () => {
         const isbn = "9788545702269";
         const book = await getIsbn(isbn);

         expect(Array.isArray(book.authors)).toBe(true);
      });

      test("should return subjects as array", async () => {
         const isbn = "9788545702269";
         const book = await getIsbn(isbn);

         expect(Array.isArray(book.subjects)).toBe(true);
      });

      test("should return dimensions as object or null", async () => {
         const isbn = "9788545702269";
         const book = await getIsbn(isbn);

         // Dimensions can be null or an object
         expect(
            book.dimensions === null || typeof book.dimensions === "object",
         ).toBe(true);
      });
   });

   describe("validation", () => {
      test("should throw validation error for empty ISBN", async () => {
         expect(getIsbn("")).rejects.toThrow(BrasilApiValidationError);
      });

      test("should throw validation error for ISBN with letters", async () => {
         expect(getIsbn("123456789X")).rejects.toThrow(
            BrasilApiValidationError,
         );
      });

      test("should throw validation error for ISBN with 9 digits", async () => {
         expect(getIsbn("123456789")).rejects.toThrow(BrasilApiValidationError);
      });

      test("should throw validation error for ISBN with 11 digits", async () => {
         expect(getIsbn("12345678901")).rejects.toThrow(
            BrasilApiValidationError,
         );
      });

      test("should throw validation error for ISBN with 12 digits", async () => {
         expect(getIsbn("123456789012")).rejects.toThrow(
            BrasilApiValidationError,
         );
      });

      test("should throw validation error for ISBN with 14 digits", async () => {
         expect(getIsbn("12345678901234")).rejects.toThrow(
            BrasilApiValidationError,
         );
      });

      test("should throw validation error for ISBN with special characters", async () => {
         expect(getIsbn("123-456-789")).rejects.toThrow(
            BrasilApiValidationError,
         );
      });

      test("should throw validation error for ISBN with spaces", async () => {
         expect(getIsbn("123 456 789")).rejects.toThrow(
            BrasilApiValidationError,
         );
      });
   });
});
