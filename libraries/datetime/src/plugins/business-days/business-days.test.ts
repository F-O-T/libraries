import { describe, expect, it } from "vitest";
import { DateTime } from "../../core/datetime";
import { businessDaysPlugin } from "./index";

describe("Business Days Plugin", () => {
   // Install plugin before running tests
   DateTime.extend(businessDaysPlugin);

   describe("isWeekday()", () => {
      it("should return true for Monday", () => {
         // 2024-01-15 is a Monday
         const dt = new DateTime("2024-01-15T12:00:00.000Z");
         expect((dt as any).isWeekday()).toBe(true);
      });

      it("should return true for Tuesday", () => {
         // 2024-01-16 is a Tuesday
         const dt = new DateTime("2024-01-16T12:00:00.000Z");
         expect((dt as any).isWeekday()).toBe(true);
      });

      it("should return true for Wednesday", () => {
         // 2024-01-17 is a Wednesday
         const dt = new DateTime("2024-01-17T12:00:00.000Z");
         expect((dt as any).isWeekday()).toBe(true);
      });

      it("should return true for Thursday", () => {
         // 2024-01-18 is a Thursday
         const dt = new DateTime("2024-01-18T12:00:00.000Z");
         expect((dt as any).isWeekday()).toBe(true);
      });

      it("should return true for Friday", () => {
         // 2024-01-19 is a Friday
         const dt = new DateTime("2024-01-19T12:00:00.000Z");
         expect((dt as any).isWeekday()).toBe(true);
      });

      it("should return false for Saturday", () => {
         // 2024-01-20 is a Saturday
         const dt = new DateTime("2024-01-20T12:00:00.000Z");
         expect((dt as any).isWeekday()).toBe(false);
      });

      it("should return false for Sunday", () => {
         // 2024-01-21 is a Sunday
         const dt = new DateTime("2024-01-21T12:00:00.000Z");
         expect((dt as any).isWeekday()).toBe(false);
      });
   });

   describe("isWeekend()", () => {
      it("should return false for Monday", () => {
         const dt = new DateTime("2024-01-15T12:00:00.000Z");
         expect((dt as any).isWeekend()).toBe(false);
      });

      it("should return false for Friday", () => {
         const dt = new DateTime("2024-01-19T12:00:00.000Z");
         expect((dt as any).isWeekend()).toBe(false);
      });

      it("should return true for Saturday", () => {
         const dt = new DateTime("2024-01-20T12:00:00.000Z");
         expect((dt as any).isWeekend()).toBe(true);
      });

      it("should return true for Sunday", () => {
         const dt = new DateTime("2024-01-21T12:00:00.000Z");
         expect((dt as any).isWeekend()).toBe(true);
      });
   });

   describe("addBusinessDays()", () => {
      it("should add business days correctly", () => {
         // Monday + 1 business day = Tuesday
         const monday = new DateTime("2024-01-15T12:00:00.000Z");
         const tuesday = (monday as any).addBusinessDays(1);
         expect(tuesday.date()).toBe(16);
      });

      it("should skip weekends when adding business days", () => {
         // Friday + 1 business day = Monday
         const friday = new DateTime("2024-01-19T12:00:00.000Z");
         const monday = (friday as any).addBusinessDays(1);
         expect(monday.date()).toBe(22);
      });

      it("should handle multiple business days across weekends", () => {
         // Friday + 3 business days = Wednesday (skip Sat, Sun, Mon, Tue, Wed)
         const friday = new DateTime("2024-01-19T12:00:00.000Z");
         const wednesday = (friday as any).addBusinessDays(3);
         expect(wednesday.date()).toBe(24);
      });

      it("should handle adding from Saturday", () => {
         // Saturday + 1 business day = Monday
         const saturday = new DateTime("2024-01-20T12:00:00.000Z");
         const monday = (saturday as any).addBusinessDays(1);
         expect(monday.date()).toBe(22);
      });

      it("should handle adding from Sunday", () => {
         // Sunday + 1 business day = Monday
         const sunday = new DateTime("2024-01-21T12:00:00.000Z");
         const monday = (sunday as any).addBusinessDays(1);
         expect(monday.date()).toBe(22);
      });

      it("should handle adding 0 business days", () => {
         const dt = new DateTime("2024-01-15T12:00:00.000Z");
         const result = (dt as any).addBusinessDays(0);
         expect(result.valueOf()).toBe(dt.valueOf());
      });

      it("should preserve time when adding business days", () => {
         const dt = new DateTime("2024-01-15T14:30:45.123Z");
         const result = (dt as any).addBusinessDays(1);
         expect(result.hour()).toBe(14);
         expect(result.minute()).toBe(30);
         expect(result.second()).toBe(45);
         expect(result.millisecond()).toBe(123);
      });
   });

   describe("subtractBusinessDays()", () => {
      it("should subtract business days correctly", () => {
         // Tuesday - 1 business day = Monday
         const tuesday = new DateTime("2024-01-16T12:00:00.000Z");
         const monday = (tuesday as any).subtractBusinessDays(1);
         expect(monday.date()).toBe(15);
      });

      it("should skip weekends when subtracting business days", () => {
         // Monday - 1 business day = Friday
         const monday = new DateTime("2024-01-22T12:00:00.000Z");
         const friday = (monday as any).subtractBusinessDays(1);
         expect(friday.date()).toBe(19);
      });

      it("should handle multiple business days across weekends", () => {
         // Wednesday - 3 business days = Friday (previous week)
         const wednesday = new DateTime("2024-01-24T12:00:00.000Z");
         const friday = (wednesday as any).subtractBusinessDays(3);
         expect(friday.date()).toBe(19);
      });

      it("should handle subtracting from Saturday", () => {
         // Saturday - 1 business day = Friday
         const saturday = new DateTime("2024-01-20T12:00:00.000Z");
         const friday = (saturday as any).subtractBusinessDays(1);
         expect(friday.date()).toBe(19);
      });

      it("should handle subtracting from Sunday", () => {
         // Sunday - 1 business day = Friday
         const sunday = new DateTime("2024-01-21T12:00:00.000Z");
         const friday = (sunday as any).subtractBusinessDays(1);
         expect(friday.date()).toBe(19);
      });

      it("should handle subtracting 0 business days", () => {
         const dt = new DateTime("2024-01-15T12:00:00.000Z");
         const result = (dt as any).subtractBusinessDays(0);
         expect(result.valueOf()).toBe(dt.valueOf());
      });
   });

   describe("diffBusinessDays()", () => {
      it("should calculate business days between two weekdays", () => {
         // Monday to Friday = 4 business days
         const monday = new DateTime("2024-01-15T12:00:00.000Z");
         const friday = new DateTime("2024-01-19T12:00:00.000Z");
         expect((monday as any).diffBusinessDays(friday)).toBe(4);
      });

      it("should exclude weekends in calculation", () => {
         // Friday to next Monday = 1 business day
         const friday = new DateTime("2024-01-19T12:00:00.000Z");
         const monday = new DateTime("2024-01-22T12:00:00.000Z");
         expect((friday as any).diffBusinessDays(monday)).toBe(1);
      });

      it("should return negative values when going backwards", () => {
         const friday = new DateTime("2024-01-19T12:00:00.000Z");
         const monday = new DateTime("2024-01-15T12:00:00.000Z");
         expect((friday as any).diffBusinessDays(monday)).toBe(-4);
      });

      it("should return 0 for same day", () => {
         const dt1 = new DateTime("2024-01-15T12:00:00.000Z");
         const dt2 = new DateTime("2024-01-15T18:00:00.000Z");
         expect((dt1 as any).diffBusinessDays(dt2)).toBe(0);
      });

      it("should handle weekend dates", () => {
         // Saturday to Sunday = 0 business days
         const saturday = new DateTime("2024-01-20T12:00:00.000Z");
         const sunday = new DateTime("2024-01-21T12:00:00.000Z");
         expect((saturday as any).diffBusinessDays(sunday)).toBe(0);
      });

      it("should handle crossing multiple weeks", () => {
         // Monday to Monday (2 weeks) = 10 business days
         const monday1 = new DateTime("2024-01-15T12:00:00.000Z");
         const monday2 = new DateTime("2024-01-29T12:00:00.000Z");
         expect((monday1 as any).diffBusinessDays(monday2)).toBe(10);
      });
   });

   describe("Chaining", () => {
      it("should chain business day methods with other DateTime methods", () => {
         const dt = new DateTime("2024-01-15T12:00:00.000Z");
         const result = (dt as any).addBusinessDays(5).addHours(2);
         expect(result).toBeInstanceOf(DateTime);
      });

      it("should work with arithmetic operations", () => {
         const dt = new DateTime("2024-01-15T12:00:00.000Z");
         const result = (dt as any).addBusinessDays(3).subtractBusinessDays(1);
         expect((dt as any).diffBusinessDays(result)).toBe(2);
      });
   });
});
