import { describe, expect, test } from "bun:test";
import { getDomainStatus } from "../src/registrobr";

describe("getDomainStatus", () => {
   describe("successful API calls", () => {
      test("should return domain status for valid .br domain", async () => {
         const result = await getDomainStatus("google.com.br");

         expect(result).toHaveProperty("status_code");
         expect(result).toHaveProperty("status");
         expect(result).toHaveProperty("fqdn");
         expect(result).toHaveProperty("hosts");
         expect(result).toHaveProperty("publication-status");
         expect(result).toHaveProperty("expires-at");
         expect(result).toHaveProperty("suggestions");
      });

      test("should return correct types for all fields", async () => {
         const result = await getDomainStatus("google.com.br");

         expect(typeof result.status_code).toBe("number");
         expect(typeof result.status).toBe("string");
         expect(typeof result.fqdn).toBe("string");
         expect(Array.isArray(result.hosts)).toBe(true);
         expect(typeof result["publication-status"]).toBe("string");
         expect(typeof result["expires-at"]).toBe("string");
         expect(Array.isArray(result.suggestions)).toBe(true);
      });

      test("should return fqdn matching queried domain", async () => {
         const domain = "google.com.br";
         const result = await getDomainStatus(domain);

         expect(result.fqdn).toBe(domain);
      });

      test("should return valid hosts array", async () => {
         const result = await getDomainStatus("google.com.br");

         expect(Array.isArray(result.hosts)).toBe(true);
         if (result.hosts.length > 0) {
            result.hosts.forEach((host) => {
               expect(typeof host).toBe("string");
            });
         }
      });

      test("should return valid expires_at date format", async () => {
         const result = await getDomainStatus("google.com.br");

         // Check if expires-at is a valid ISO date string
         expect(result["expires-at"]).toMatch(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?.*$/,
         );
      });

      test("should return valid suggestions array", async () => {
         const result = await getDomainStatus("google.com.br");

         expect(Array.isArray(result.suggestions)).toBe(true);
         if (result.suggestions.length > 0) {
            result.suggestions.forEach((suggestion) => {
               expect(typeof suggestion).toBe("string");
            });
         }
      });

      test("should handle different .br domains", async () => {
         const result = await getDomainStatus("uol.com.br");

         expect(result).toHaveProperty("fqdn");
         expect(result.fqdn).toBe("uol.com.br");
         expect(result).toHaveProperty("status");
      });
   });
});
