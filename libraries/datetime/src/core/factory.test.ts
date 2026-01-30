import { describe, expect, test } from "bun:test";
import { InvalidDateError } from "../errors";
import type { DateInput } from "../types";
import { DateTime } from "./datetime";
import { datetime } from "./factory";

describe("datetime factory function", () => {
   describe("basic usage", () => {
      test("creates DateTime instance without arguments (current time)", () => {
         const dt = datetime();
         expect(dt).toBeInstanceOf(DateTime);
         expect(dt.isValid()).toBe(true);

         // Should be close to current time (within 100ms)
         const now = Date.now();
         expect(Math.abs(dt.valueOf() - now)).toBeLessThan(100);
      });

      test("creates DateTime from Date object", () => {
         const date = new Date("2024-01-15T10:30:00Z");
         const dt = datetime(date);

         expect(dt).toBeInstanceOf(DateTime);
         expect(dt.isValid()).toBe(true);
         expect(dt.toISO()).toBe("2024-01-15T10:30:00.000Z");
      });

      test("creates DateTime from ISO string", () => {
         const dt = datetime("2024-01-15T10:30:00Z");

         expect(dt).toBeInstanceOf(DateTime);
         expect(dt.isValid()).toBe(true);
         expect(dt.toISO()).toBe("2024-01-15T10:30:00.000Z");
      });

      test("creates DateTime from timestamp", () => {
         const timestamp = 1705315800000; // 2024-01-15T10:30:00Z
         const dt = datetime(timestamp);

         expect(dt).toBeInstanceOf(DateTime);
         expect(dt.isValid()).toBe(true);
         expect(dt.valueOf()).toBe(timestamp);
      });

      test("creates DateTime from another DateTime", () => {
         const dt1 = datetime("2024-01-15T10:30:00Z");
         const dt2 = datetime(dt1);

         expect(dt2).toBeInstanceOf(DateTime);
         expect(dt2.isValid()).toBe(true);
         expect(dt2.toISO()).toBe(dt1.toISO());
         expect(dt2.valueOf()).toBe(dt1.valueOf());
      });
   });

   describe("edge cases", () => {
      test("creates invalid DateTime from invalid date string", () => {
         const dt = datetime("invalid");

         expect(dt).toBeInstanceOf(DateTime);
         expect(dt.isValid()).toBe(false);
      });

      test("creates invalid DateTime from NaN", () => {
         const dt = datetime(NaN);

         expect(dt).toBeInstanceOf(DateTime);
         expect(dt.isValid()).toBe(false);
      });

      test("creates invalid DateTime from invalid Date object", () => {
         const dt = datetime(new Date("invalid"));

         expect(dt).toBeInstanceOf(DateTime);
         expect(dt.isValid()).toBe(false);
      });

      test("throws InvalidDateError for non-DateInput types", () => {
         expect(() => datetime({} as any)).toThrow(InvalidDateError);
         expect(() => datetime([] as any)).toThrow(InvalidDateError);
         expect(() => datetime(true as any)).toThrow(InvalidDateError);
         expect(() => datetime(null as any)).toThrow(InvalidDateError);
      });
   });

   describe("immutability", () => {
      test("creates independent instances", () => {
         const dt1 = datetime("2024-01-15T10:30:00Z");
         const dt2 = datetime(dt1);
         const dt3 = dt2.addDays(1);

         expect(dt1.toISO()).toBe("2024-01-15T10:30:00.000Z");
         expect(dt2.toISO()).toBe("2024-01-15T10:30:00.000Z");
         expect(dt3.toISO()).toBe("2024-01-16T10:30:00.000Z");
      });

      test("does not mutate input Date object", () => {
         const date = new Date("2024-01-15T10:30:00Z");
         const originalTime = date.getTime();
         const dt = datetime(date);

         dt.addDays(1);

         expect(date.getTime()).toBe(originalTime);
      });
   });

   describe("equivalence to constructor", () => {
      test("produces same result as constructor", () => {
         const inputs: Array<DateInput | undefined> = [
            undefined,
            new Date("2024-01-15T10:30:00Z"),
            "2024-01-15T10:30:00Z",
            1705315800000,
         ];

         for (const input of inputs) {
            const factory = datetime(input);
            const constructor = new DateTime(input);

            expect(factory.valueOf()).toBe(constructor.valueOf());
            expect(factory.isValid()).toBe(constructor.isValid());
         }
      });

      test("throws same errors as constructor", () => {
         const invalidInputs = [{}, [], true, null];

         for (const input of invalidInputs) {
            expect(() => datetime(input as any)).toThrow(InvalidDateError);
            expect(() => new DateTime(input as any)).toThrow(InvalidDateError);
         }
      });
   });

   describe("chaining", () => {
      test("can chain operations after factory creation", () => {
         const dt = datetime("2024-01-15T10:30:00Z")
            .addDays(5)
            .addHours(3)
            .subtractMinutes(15);

         expect(dt.toISO()).toBe("2024-01-20T13:15:00.000Z");
      });

      test("can use comparison methods", () => {
         const dt1 = datetime("2024-01-15T10:30:00Z");
         const dt2 = datetime("2024-01-16T10:30:00Z");

         expect(dt1.isBefore(dt2)).toBe(true);
         expect(dt2.isAfter(dt1)).toBe(true);
         expect(dt1.isSame(dt1)).toBe(true);
      });

      test("can use getter methods", () => {
         const dt = datetime("2024-01-15T10:30:45.123Z");

         expect(dt.year()).toBe(2024);
         expect(dt.month()).toBe(0); // January is 0
         expect(dt.date()).toBe(15);
         expect(dt.hour()).toBe(10);
         expect(dt.minute()).toBe(30);
         expect(dt.second()).toBe(45);
         expect(dt.millisecond()).toBe(123);
      });
   });
});
