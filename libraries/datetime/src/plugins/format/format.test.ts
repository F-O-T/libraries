import { describe, expect, it } from "bun:test";
import { DateTime } from "../../core/datetime";
import { formatPlugin } from "./index";

describe("Format Plugin", () => {
   // Install plugin before running tests
   DateTime.extend(formatPlugin);

   describe("format()", () => {
      it("should format year tokens", () => {
         const dt = new DateTime("2024-01-15T14:30:45.123Z");
         expect((dt as any).format("YYYY")).toBe("2024");
         expect((dt as any).format("YY")).toBe("24");
      });

      it("should format month tokens", () => {
         const dt = new DateTime("2024-01-15T14:30:45.123Z");
         expect((dt as any).format("MM")).toBe("01");
         expect((dt as any).format("M")).toBe("1");
      });

      it("should format day tokens", () => {
         const dt = new DateTime("2024-01-05T14:30:45.123Z");
         expect((dt as any).format("DD")).toBe("05");
         expect((dt as any).format("D")).toBe("5");
      });

      it("should format hour tokens (24-hour)", () => {
         const dt = new DateTime("2024-01-15T14:30:45.123Z");
         expect((dt as any).format("HH")).toBe("14");
         expect((dt as any).format("H")).toBe("14");
      });

      it("should format hour tokens (12-hour)", () => {
         const dt = new DateTime("2024-01-15T14:30:45.123Z");
         expect((dt as any).format("hh")).toBe("02");
         expect((dt as any).format("h")).toBe("2");

         const dtAM = new DateTime("2024-01-15T09:30:45.123Z");
         expect((dtAM as any).format("hh")).toBe("09");
         expect((dtAM as any).format("h")).toBe("9");
      });

      it("should handle midnight and noon in 12-hour format", () => {
         const midnight = new DateTime("2024-01-15T00:00:00.000Z");
         expect((midnight as any).format("h")).toBe("12");

         const noon = new DateTime("2024-01-15T12:00:00.000Z");
         expect((noon as any).format("h")).toBe("12");
      });

      it("should format minute tokens", () => {
         const dt = new DateTime("2024-01-15T14:05:45.123Z");
         expect((dt as any).format("mm")).toBe("05");
         expect((dt as any).format("m")).toBe("5");
      });

      it("should format second tokens", () => {
         const dt = new DateTime("2024-01-15T14:30:05.123Z");
         expect((dt as any).format("ss")).toBe("05");
         expect((dt as any).format("s")).toBe("5");
      });

      it("should format millisecond tokens", () => {
         const dt = new DateTime("2024-01-15T14:30:45.123Z");
         expect((dt as any).format("SSS")).toBe("123");

         const dtZero = new DateTime("2024-01-15T14:30:45.000Z");
         expect((dtZero as any).format("SSS")).toBe("000");
      });

      it("should format AM/PM tokens", () => {
         const dtAM = new DateTime("2024-01-15T09:30:45.123Z");
         expect((dtAM as any).format("A")).toBe("AM");
         expect((dtAM as any).format("a")).toBe("am");

         const dtPM = new DateTime("2024-01-15T14:30:45.123Z");
         expect((dtPM as any).format("A")).toBe("PM");
         expect((dtPM as any).format("a")).toBe("pm");
      });

      it("should format day of week tokens", () => {
         // 2024-01-15 is a Monday
         const monday = new DateTime("2024-01-15T12:00:00.000Z");
         expect((monday as any).format("dddd")).toBe("Monday");
         expect((monday as any).format("ddd")).toBe("Mon");
         expect((monday as any).format("dd")).toBe("Mo");
         expect((monday as any).format("d")).toBe("1");

         // Sunday should be 0
         const sunday = new DateTime("2024-01-21T12:00:00.000Z");
         expect((sunday as any).format("d")).toBe("0");
      });

      it("should format month name tokens", () => {
         const january = new DateTime("2024-01-15T12:00:00.000Z");
         expect((january as any).format("MMMM")).toBe("January");
         expect((january as any).format("MMM")).toBe("Jan");

         const december = new DateTime("2024-12-15T12:00:00.000Z");
         expect((december as any).format("MMMM")).toBe("December");
         expect((december as any).format("MMM")).toBe("Dec");
      });

      it("should format complex format strings", () => {
         const dt = new DateTime("2024-01-15T14:30:45.123Z");
         expect((dt as any).format("YYYY-MM-DD")).toBe("2024-01-15");
         expect((dt as any).format("MM/DD/YYYY")).toBe("01/15/2024");
         expect((dt as any).format("YYYY-MM-DD HH:mm:ss")).toBe(
            "2024-01-15 14:30:45",
         );
         expect((dt as any).format("YYYY-MM-DD HH:mm:ss.SSS")).toBe(
            "2024-01-15 14:30:45.123",
         );
      });

      it("should format with text separators", () => {
         const dt = new DateTime("2024-01-15T14:30:45.123Z");
         expect((dt as any).format("MMMM D, YYYY")).toBe("January 15, 2024");
         expect((dt as any).format("dddd, MMMM D, YYYY")).toBe(
            "Monday, January 15, 2024",
         );
         expect((dt as any).format("h:mm A")).toBe("2:30 PM");
         expect((dt as any).format("hh:mm:ss a")).toBe("02:30:45 pm");
      });

      it("should handle escaped characters in brackets", () => {
         const dt = new DateTime("2024-01-15T14:30:45.123Z");
         expect((dt as any).format("[Year:] YYYY")).toBe("Year: 2024");
         expect((dt as any).format("YYYY [escaped] MM")).toBe(
            "2024 escaped 01",
         );
         expect((dt as any).format("[YYYY] YYYY")).toBe("YYYY 2024");
      });

      it("should return default format when no format string provided", () => {
         const dt = new DateTime("2024-01-15T14:30:45.123Z");
         const result = (dt as any).format();
         // Should return ISO string or a default format
         expect(result).toBeDefined();
         expect(typeof result).toBe("string");
      });

      it("should handle edge cases", () => {
         // Midnight
         const midnight = new DateTime("2024-01-15T00:00:00.000Z");
         expect((midnight as any).format("HH:mm:ss")).toBe("00:00:00");
         expect((midnight as any).format("hh:mm:ss A")).toBe("12:00:00 AM");

         // Single digit values
         const dt = new DateTime("2024-01-05T09:05:05.005Z");
         expect((dt as any).format("M/D/YY h:m:s")).toBe("1/5/24 9:5:5");
      });

      it("should preserve literal text", () => {
         const dt = new DateTime("2024-01-15T14:30:45.123Z");
         expect((dt as any).format("[Today is] YYYY-MM-DD")).toBe(
            "Today is 2024-01-15",
         );
         expect((dt as any).format("[The time is] HH:mm")).toBe(
            "The time is 14:30",
         );
      });
   });

   describe("Chaining", () => {
      it("should work with other DateTime methods", () => {
         const dt = new DateTime("2024-01-15T14:30:45.123Z");
         const formatted = (dt.addDays(1) as any).format("YYYY-MM-DD");
         expect(formatted).toBe("2024-01-16");
      });
   });
});
