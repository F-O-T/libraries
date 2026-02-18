import { describe, expect, it } from "bun:test";
import { hash } from "../src/hash.ts";

describe("hash", () => {
   it("SHA-256 of empty string", () => {
      const result = hash("sha256", new Uint8Array(0));
      expect(result.length).toBe(32);
      // Known: SHA-256("") = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
      expect(result[0]).toBe(0xe3);
      expect(result[1]).toBe(0xb0);
   });

   it("SHA-256 of 'hello'", () => {
      const data = new TextEncoder().encode("hello");
      const result = hash("sha256", data);
      expect(result.length).toBe(32);
      // Known: 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
      expect(result[0]).toBe(0x2c);
      expect(result[1]).toBe(0xf2);
   });

   it("SHA-512 produces 64 bytes", () => {
      const result = hash("sha512", new Uint8Array(0));
      expect(result.length).toBe(64);
   });

   it("SHA-384 produces 48 bytes", () => {
      const result = hash("sha384", new Uint8Array(0));
      expect(result.length).toBe(48);
   });
});
