import { describe, expect, mock, test } from "bun:test";
import { z } from "zod";
import { fetchApi } from "../src/client";
import { configureBrasilApi, resetConfig } from "../src/config";
import { BrasilApiNetworkError, BrasilApiResponseError } from "../src/errors";

describe("fetchApi", () => {
   test("should fetch and validate successful response", async () => {
      const schema = z.object({ message: z.string() });

      global.fetch = mock(async () => Response.json({ message: "success" }));

      const result = await fetchApi("/test", schema);
      expect(result).toEqual({ message: "success" });
   });

   test("should use configured base URL", async () => {
      resetConfig();
      configureBrasilApi({ baseUrl: "https://custom.api" });

      const schema = z.object({ data: z.string() });
      let requestedUrl = "";

      global.fetch = mock(async (url: string) => {
         requestedUrl = url;
         return Response.json({ data: "test" });
      });

      await fetchApi("/endpoint", schema);
      expect(requestedUrl).toBe("https://custom.api/endpoint");

      resetConfig();
   });

   test("should throw network error on fetch failure", async () => {
      const schema = z.object({ data: z.string() });

      global.fetch = mock(async () => {
         throw new Error("Network error");
      });

      expect(fetchApi("/test", schema)).rejects.toThrow(BrasilApiNetworkError);
   });

   test("should throw network error on non-200 status", async () => {
      const schema = z.object({ data: z.string() });

      global.fetch = mock(
         async () =>
            new Response(JSON.stringify({ error: "Not found" }), {
               status: 404,
            }),
      );

      expect(fetchApi("/test", schema)).rejects.toThrow(BrasilApiNetworkError);
   });

   test("should throw response error on validation failure", async () => {
      const schema = z.object({ required: z.string() });

      global.fetch = mock(async () => Response.json({ wrong: "field" }));

      expect(fetchApi("/test", schema)).rejects.toThrow(BrasilApiResponseError);
   });

   test("should respect timeout configuration", async () => {
      resetConfig();
      configureBrasilApi({ timeout: 100 });

      const schema = z.object({ data: z.string() });

      global.fetch = mock(
         async (_url: string, options?: RequestInit) =>
            new Promise((resolve, reject) => {
               const checkAbort = () => {
                  if (options?.signal?.aborted) {
                     reject(new DOMException("Aborted", "AbortError"));
                  }
               };

               options?.signal?.addEventListener("abort", checkAbort);

               setTimeout(() => {
                  checkAbort();
                  resolve(Response.json({ data: "slow" }));
               }, 500);
            }),
      );

      expect(fetchApi("/test", schema)).rejects.toThrow(BrasilApiNetworkError);

      resetConfig();
   });
});
