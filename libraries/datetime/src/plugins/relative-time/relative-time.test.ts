import { describe, expect, it } from "bun:test";
import { DateTime } from "../../core/datetime";
import { relativeTimePlugin } from "./index";

describe("Relative Time Plugin", () => {
   // Install plugin before running tests
   DateTime.extend(relativeTimePlugin);

   // Use a fixed reference time for testing
   const referenceTime = new DateTime("2024-01-15T12:00:00.000Z");

   describe("from()", () => {
      it("should return 'a few seconds ago' for recent past", () => {
         const dt = new DateTime("2024-01-15T11:59:55.000Z"); // 5 seconds before
         expect((dt as any).from(referenceTime)).toBe("a few seconds ago");
      });

      it("should return 'a minute ago' for 1 minute", () => {
         const dt = new DateTime("2024-01-15T11:59:00.000Z");
         expect((dt as any).from(referenceTime)).toBe("a minute ago");
      });

      it("should return 'X minutes ago' for multiple minutes", () => {
         const dt = new DateTime("2024-01-15T11:45:00.000Z"); // 15 minutes before
         expect((dt as any).from(referenceTime)).toBe("15 minutes ago");
      });

      it("should return 'an hour ago' for 1 hour", () => {
         const dt = new DateTime("2024-01-15T11:00:00.000Z");
         expect((dt as any).from(referenceTime)).toBe("an hour ago");
      });

      it("should return 'X hours ago' for multiple hours", () => {
         const dt = new DateTime("2024-01-15T09:00:00.000Z"); // 3 hours before
         expect((dt as any).from(referenceTime)).toBe("3 hours ago");
      });

      it("should return 'a day ago' for 1 day", () => {
         const dt = new DateTime("2024-01-14T12:00:00.000Z");
         expect((dt as any).from(referenceTime)).toBe("a day ago");
      });

      it("should return 'X days ago' for multiple days", () => {
         const dt = new DateTime("2024-01-10T12:00:00.000Z"); // 5 days before
         expect((dt as any).from(referenceTime)).toBe("5 days ago");
      });

      it("should return 'a month ago' for 1 month", () => {
         const dt = new DateTime("2023-12-15T12:00:00.000Z");
         expect((dt as any).from(referenceTime)).toBe("a month ago");
      });

      it("should return 'X months ago' for multiple months", () => {
         const dt = new DateTime("2023-10-15T12:00:00.000Z"); // 3 months before
         expect((dt as any).from(referenceTime)).toBe("3 months ago");
      });

      it("should return 'a year ago' for 1 year", () => {
         const dt = new DateTime("2023-01-15T12:00:00.000Z");
         expect((dt as any).from(referenceTime)).toBe("a year ago");
      });

      it("should return 'X years ago' for multiple years", () => {
         const dt = new DateTime("2021-01-15T12:00:00.000Z"); // 3 years before
         expect((dt as any).from(referenceTime)).toBe("3 years ago");
      });

      it("should return 'in a few seconds' for near future", () => {
         const dt = new DateTime("2024-01-15T12:00:05.000Z"); // 5 seconds after
         expect((dt as any).from(referenceTime)).toBe("in a few seconds");
      });

      it("should return 'in a minute' for 1 minute future", () => {
         const dt = new DateTime("2024-01-15T12:01:00.000Z");
         expect((dt as any).from(referenceTime)).toBe("in a minute");
      });

      it("should return 'in X minutes' for multiple minutes future", () => {
         const dt = new DateTime("2024-01-15T12:15:00.000Z"); // 15 minutes after
         expect((dt as any).from(referenceTime)).toBe("in 15 minutes");
      });

      it("should return 'in an hour' for 1 hour future", () => {
         const dt = new DateTime("2024-01-15T13:00:00.000Z");
         expect((dt as any).from(referenceTime)).toBe("in an hour");
      });

      it("should return 'in X hours' for multiple hours future", () => {
         const dt = new DateTime("2024-01-15T15:00:00.000Z"); // 3 hours after
         expect((dt as any).from(referenceTime)).toBe("in 3 hours");
      });

      it("should return 'in a day' for 1 day future", () => {
         const dt = new DateTime("2024-01-16T12:00:00.000Z");
         expect((dt as any).from(referenceTime)).toBe("in a day");
      });

      it("should return 'in X days' for multiple days future", () => {
         const dt = new DateTime("2024-01-20T12:00:00.000Z"); // 5 days after
         expect((dt as any).from(referenceTime)).toBe("in 5 days");
      });

      it("should handle same time", () => {
         const dt1 = new DateTime("2024-01-15T12:00:00.000Z");
         const dt2 = new DateTime("2024-01-15T12:00:00.000Z");
         expect((dt1 as any).from(dt2)).toBe("a few seconds ago");
      });

      it("should handle days calculation", () => {
         const dt1 = new DateTime("2024-01-15T12:00:00.000Z");
         const dt2 = new DateTime("2024-01-10T12:00:00.000Z");
         expect((dt2 as any).from(dt1)).toBe("5 days ago");
      });
   });

   describe("to()", () => {
      it("should return opposite of from() for past", () => {
         const dt = new DateTime("2024-01-15T11:00:00.000Z"); // 1 hour before
         expect((dt as any).to(referenceTime)).toBe("in an hour");
      });

      it("should return opposite of from() for future", () => {
         const dt = new DateTime("2024-01-15T13:00:00.000Z"); // 1 hour after
         expect((dt as any).to(referenceTime)).toBe("an hour ago");
      });
   });

   describe("fromNow() and toNow()", () => {
      it("should return a string for fromNow()", () => {
         const dt = new DateTime("2024-01-01T12:00:00.000Z");
         const result = (dt as any).fromNow();
         expect(typeof result).toBe("string");
         expect(result.length).toBeGreaterThan(0);
      });

      it("should return a string for toNow()", () => {
         const dt = new DateTime("2024-01-01T12:00:00.000Z");
         const result = (dt as any).toNow();
         expect(typeof result).toBe("string");
         expect(result.length).toBeGreaterThan(0);
      });

      it("fromNow and toNow should be opposites", () => {
         const dt = new DateTime("2024-01-01T12:00:00.000Z");
         const fromResult = (dt as any).fromNow();
         const toResult = (dt as any).toNow();

         // One should contain "ago" and the other "in", or both could be "a few seconds"
         const hasAgo = fromResult.includes("ago");
         const hasIn = toResult.includes("in");
         expect(hasAgo || hasIn || fromResult.includes("few seconds")).toBe(
            true,
         );
      });
   });

   describe("Chaining", () => {
      it("should work with other DateTime methods", () => {
         const dt = new DateTime("2024-01-15T11:00:00.000Z");
         const relative = (dt.addHours(1) as any).from(referenceTime);
         expect(relative).toBe("a few seconds ago");
      });
   });
});
