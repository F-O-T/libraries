import { describe, expect, it } from "vitest";
import { DateTime } from "../../core/datetime";
import { timezonePlugin } from "./index";

describe("Timezone Plugin", () => {
   // Install plugin before running tests
   DateTime.extend(timezonePlugin);

   describe("tz()", () => {
      it("should set timezone and return DateTime instance", () => {
         const dt = new DateTime("2024-01-15T12:00:00.000Z");
         const result = (dt as any).tz("America/New_York");

         expect(result).toBeInstanceOf(DateTime);
         expect((result as any)._timezone).toBe("America/New_York");
      });

      it("should handle valid IANA timezone strings", () => {
         const dt = new DateTime("2024-01-15T12:00:00.000Z");

         expect(() => (dt as any).tz("America/New_York")).not.toThrow();
         expect(() => (dt as any).tz("Europe/London")).not.toThrow();
         expect(() => (dt as any).tz("Asia/Tokyo")).not.toThrow();
         expect(() => (dt as any).tz("UTC")).not.toThrow();
      });

      it("should throw error for invalid timezone", () => {
         const dt = new DateTime("2024-01-15T12:00:00.000Z");

         expect(() => (dt as any).tz("Invalid/Timezone")).toThrow();
         expect(() => (dt as any).tz("")).toThrow();
      });

      it("should preserve the same moment in time", () => {
         const dt = new DateTime("2024-01-15T12:00:00.000Z");
         const withTz = (dt as any).tz("America/New_York");

         expect(withTz.valueOf()).toBe(dt.valueOf());
      });
   });

   describe("toTimezone()", () => {
      it("should convert to specified timezone", () => {
         const dt = new DateTime("2024-01-15T12:00:00.000Z");
         const result = (dt as any).toTimezone("America/New_York");

         expect(result).toBeInstanceOf(DateTime);
         expect((result as any)._timezone).toBe("America/New_York");
      });

      it("should handle timezone conversion correctly", () => {
         const dt = new DateTime("2024-01-15T12:00:00.000Z");
         const nyTime = (dt as any).toTimezone("America/New_York");

         // UTC 12:00 should be 07:00 in NY (EST is UTC-5)
         expect(nyTime.valueOf()).toBe(dt.valueOf());
      });

      it("should chain with other methods", () => {
         const dt = new DateTime("2024-01-15T12:00:00.000Z");
         const result = (dt as any).toTimezone("America/New_York").addHours(2);

         expect(result).toBeInstanceOf(DateTime);
      });
   });

   describe("utc()", () => {
      it("should set timezone to UTC", () => {
         const dt = new DateTime("2024-01-15T12:00:00.000Z");
         const result = (dt as any).tz("America/New_York").utc();

         expect(result).toBeInstanceOf(DateTime);
         expect((result as any)._timezone).toBe("UTC");
      });

      it("should preserve timestamp", () => {
         const dt = new DateTime("2024-01-15T12:00:00.000Z");
         const withTz = (dt as any).tz("America/New_York");
         const backToUtc = withTz.utc();

         expect(backToUtc.valueOf()).toBe(dt.valueOf());
      });
   });

   describe("local()", () => {
      it("should set timezone to local", () => {
         const dt = new DateTime("2024-01-15T12:00:00.000Z");
         const result = (dt as any).local();

         expect(result).toBeInstanceOf(DateTime);
         expect((result as any)._timezone).toBeDefined();
      });

      it("should preserve timestamp", () => {
         const dt = new DateTime("2024-01-15T12:00:00.000Z");
         const localTime = (dt as any).local();

         expect(localTime.valueOf()).toBe(dt.valueOf());
      });
   });

   describe("getTimezone()", () => {
      it("should return current timezone", () => {
         const dt = new DateTime("2024-01-15T12:00:00.000Z");
         const withTz = (dt as any).tz("America/New_York");

         expect((withTz as any).getTimezone()).toBe("America/New_York");
      });

      it("should return UTC for default instances", () => {
         const dt = new DateTime("2024-01-15T12:00:00.000Z");

         expect((dt as any).getTimezone()).toBe("UTC");
      });
   });

   describe("Static tz() method", () => {
      it("should create DateTime in specified timezone", () => {
         const dt = (DateTime as any).tz("2024-01-15T12:00:00", "America/New_York");

         expect(dt).toBeInstanceOf(DateTime);
         expect((dt as any)._timezone).toBe("America/New_York");
      });

      it("should handle current time when no input provided", () => {
         const dt = (DateTime as any).tz(undefined, "America/New_York");

         expect(dt).toBeInstanceOf(DateTime);
         expect((dt as any)._timezone).toBe("America/New_York");
      });
   });
});
