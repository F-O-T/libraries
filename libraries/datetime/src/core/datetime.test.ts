import { beforeEach, describe, expect, test as it } from "bun:test";
import { InvalidDateError } from "../errors";
import { DateTime } from "./datetime";

describe("DateTime", () => {
   describe("Constructor", () => {
      it("should create DateTime from current time when no input provided", () => {
         const now = new Date();
         const dt = new DateTime();
         expect(dt).toBeInstanceOf(DateTime);
         expect(dt.isValid()).toBe(true);
         // Should be within 100ms of now
         expect(Math.abs(dt.valueOf() - now.getTime())).toBeLessThan(100);
      });

      it("should create DateTime from Date object", () => {
         const date = new Date("2024-01-15T10:30:00.000Z");
         const dt = new DateTime(date);
         expect(dt.isValid()).toBe(true);
         expect(dt.valueOf()).toBe(date.getTime());
         expect(dt.toDate()).toEqual(date);
      });

      it("should create DateTime from ISO string", () => {
         const isoString = "2024-01-15T10:30:00.000Z";
         const dt = new DateTime(isoString);
         expect(dt.isValid()).toBe(true);
         expect(dt.toISO()).toBe(isoString);
      });

      it("should create DateTime from timestamp (number)", () => {
         const timestamp = 1705314600000; // 2024-01-15T10:30:00.000Z
         const dt = new DateTime(timestamp);
         expect(dt.isValid()).toBe(true);
         expect(dt.valueOf()).toBe(timestamp);
      });

      it("should create DateTime from another DateTime instance", () => {
         const dt1 = new DateTime("2024-01-15T10:30:00.000Z");
         const dt2 = new DateTime(dt1);
         expect(dt2.isValid()).toBe(true);
         expect(dt2.valueOf()).toBe(dt1.valueOf());
         // Should be a different instance
         expect(dt2).not.toBe(dt1);
      });

      it("should throw InvalidDateError for invalid input type", () => {
         expect(() => new DateTime({} as any)).toThrow(InvalidDateError);
         expect(() => new DateTime([] as any)).toThrow(InvalidDateError);
         expect(() => new DateTime(true as any)).toThrow(InvalidDateError);
      });

      it("should create invalid DateTime for Invalid Date", () => {
         const dt = new DateTime("invalid-date-string");
         expect(dt.isValid()).toBe(false);
         expect(Number.isNaN(dt.valueOf())).toBe(true);
      });

      it("should create invalid DateTime for invalid timestamp", () => {
         const dt = new DateTime(NaN);
         expect(dt.isValid()).toBe(false);
      });
   });

   describe("Core Methods", () => {
      describe("isValid()", () => {
         it("should return true for valid dates", () => {
            expect(new DateTime("2024-01-15").isValid()).toBe(true);
            expect(new DateTime(1705314600000).isValid()).toBe(true);
            expect(new DateTime(new Date()).isValid()).toBe(true);
         });

         it("should return false for invalid dates", () => {
            expect(new DateTime("not-a-date").isValid()).toBe(false);
            expect(new DateTime(NaN).isValid()).toBe(false);
            expect(new DateTime(new Date("invalid")).isValid()).toBe(false);
         });
      });

      describe("toDate()", () => {
         it("should return a Date object", () => {
            const dt = new DateTime("2024-01-15T10:30:00.000Z");
            const date = dt.toDate();
            expect(date).toBeInstanceOf(Date);
            expect(date.getTime()).toBe(1705314600000);
         });

         it("should return a clone, not the internal date", () => {
            const dt = new DateTime("2024-01-15T10:30:00.000Z");
            const date1 = dt.toDate();
            const date2 = dt.toDate();
            expect(date1).not.toBe(date2);
            expect(date1.getTime()).toBe(date2.getTime());
         });
      });

      describe("toISO()", () => {
         it("should return ISO 8601 string", () => {
            const dt = new DateTime("2024-01-15T10:30:00.000Z");
            expect(dt.toISO()).toBe("2024-01-15T10:30:00.000Z");
         });

         it("should handle different timezones", () => {
            const dt = new DateTime(1705314600000);
            const iso = dt.toISO();
            expect(iso).toMatch(
               /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
            );
         });
      });

      describe("valueOf()", () => {
         it("should return Unix timestamp in milliseconds", () => {
            const timestamp = 1705314600000;
            const dt = new DateTime(timestamp);
            expect(dt.valueOf()).toBe(timestamp);
         });

         it("should allow numeric operations", () => {
            const dt1 = new DateTime("2024-01-15T10:30:00.000Z");
            const dt2 = new DateTime("2024-01-15T11:30:00.000Z");
            const diff = +dt2 - +dt1;
            expect(diff).toBe(3600000); // 1 hour in ms
         });
      });
   });

   describe("Immutability", () => {
      it("should not modify original Date when creating DateTime", () => {
         const originalDate = new Date("2024-01-15T10:30:00.000Z");
         const originalTime = originalDate.getTime();
         const dt = new DateTime(originalDate);
         originalDate.setHours(15);
         expect(dt.valueOf()).toBe(originalTime);
      });

      it("should not allow external modification of internal date", () => {
         const dt = new DateTime("2024-01-15T10:30:00.000Z");
         const originalTime = dt.valueOf();
         const date = dt.toDate();
         date.setHours(15);
         expect(dt.valueOf()).toBe(originalTime);
      });
   });

   describe("Plugin System", () => {
      beforeEach(() => {
         // Clear all plugins before each test
         DateTime["plugins"].clear();
      });

      describe("extend()", () => {
         it("should register a plugin", () => {
            const plugin = {
               name: "test-plugin",
               install: (DateTimeClass: any) => {
                  DateTimeClass.prototype.testMethod = () => "test";
               },
            };
            DateTime.extend(plugin);
            expect(DateTime.hasPlugin("test-plugin")).toBe(true);
         });

         it("should call plugin install function", () => {
            let installCalled = false;
            const plugin = {
               name: "test-plugin",
               install: () => {
                  installCalled = true;
               },
            };
            DateTime.extend(plugin);
            expect(installCalled).toBe(true);
         });

         it("should pass options to plugin install", () => {
            let receivedOptions: any;
            const plugin = {
               name: "test-plugin",
               install: (_: any, options: any) => {
                  receivedOptions = options;
               },
            };
            const options = { foo: "bar" };
            DateTime.extend(plugin, options);
            expect(receivedOptions).toEqual(options);
         });

         it("should throw error when registering plugin with duplicate name", () => {
            const plugin1 = {
               name: "duplicate",
               install: () => {},
            };
            const plugin2 = {
               name: "duplicate",
               install: () => {},
            };
            DateTime.extend(plugin1);
            expect(() => DateTime.extend(plugin2)).toThrow(
               "Plugin duplicate is already registered",
            );
         });

         it("should extend DateTime prototype with plugin methods", () => {
            const plugin = {
               name: "custom-plugin",
               install: (DateTimeClass: any) => {
                  DateTimeClass.prototype.customMethod = function () {
                     return this.valueOf() + 1000;
                  };
               },
            };
            DateTime.extend(plugin);
            const dt = new DateTime(1000);
            expect((dt as any).customMethod()).toBe(2000);
         });
      });

      describe("hasPlugin()", () => {
         it("should return true for registered plugins", () => {
            const plugin = {
               name: "test-plugin",
               install: () => {},
            };
            DateTime.extend(plugin);
            expect(DateTime.hasPlugin("test-plugin")).toBe(true);
         });

         it("should return false for non-registered plugins", () => {
            expect(DateTime.hasPlugin("nonexistent")).toBe(false);
         });
      });

      describe("getPlugin()", () => {
         it("should return plugin for registered plugins", () => {
            const plugin = {
               name: "test-plugin",
               install: () => {},
            };
            DateTime.extend(plugin);
            expect(DateTime.getPlugin("test-plugin")).toBe(plugin);
         });

         it("should return undefined for non-registered plugins", () => {
            expect(DateTime.getPlugin("nonexistent")).toBeUndefined();
         });
      });
   });

   describe("Arithmetic Operations", () => {
      describe("addMilliseconds()", () => {
         it("should add milliseconds and return new DateTime", () => {
            const dt = new DateTime("2024-01-15T10:30:00.000Z");
            const result = dt.addMilliseconds(500);
            expect(result).toBeInstanceOf(DateTime);
            expect(result.valueOf()).toBe(dt.valueOf() + 500);
            expect(dt.valueOf()).toBe(
               new DateTime("2024-01-15T10:30:00.000Z").valueOf(),
            ); // Original unchanged
         });

         it("should handle negative values", () => {
            const dt = new DateTime("2024-01-15T10:30:00.000Z");
            const result = dt.addMilliseconds(-500);
            expect(result.valueOf()).toBe(dt.valueOf() - 500);
         });

         it("should handle zero", () => {
            const dt = new DateTime("2024-01-15T10:30:00.000Z");
            const result = dt.addMilliseconds(0);
            expect(result.valueOf()).toBe(dt.valueOf());
            expect(result).not.toBe(dt); // Still returns new instance
         });
      });

      describe("addSeconds()", () => {
         it("should add seconds and return new DateTime", () => {
            const dt = new DateTime("2024-01-15T10:30:00.000Z");
            const result = dt.addSeconds(30);
            expect(result).toBeInstanceOf(DateTime);
            expect(result.valueOf()).toBe(dt.valueOf() + 30000);
         });

         it("should handle negative values", () => {
            const dt = new DateTime("2024-01-15T10:30:00.000Z");
            const result = dt.addSeconds(-30);
            expect(result.valueOf()).toBe(dt.valueOf() - 30000);
         });
      });

      describe("addMinutes()", () => {
         it("should add minutes and return new DateTime", () => {
            const dt = new DateTime("2024-01-15T10:30:00.000Z");
            const result = dt.addMinutes(15);
            expect(result).toBeInstanceOf(DateTime);
            expect(result.valueOf()).toBe(dt.valueOf() + 15 * 60 * 1000);
         });

         it("should handle negative values", () => {
            const dt = new DateTime("2024-01-15T10:30:00.000Z");
            const result = dt.addMinutes(-15);
            expect(result.valueOf()).toBe(dt.valueOf() - 15 * 60 * 1000);
         });
      });

      describe("addHours()", () => {
         it("should add hours and return new DateTime", () => {
            const dt = new DateTime("2024-01-15T10:30:00.000Z");
            const result = dt.addHours(2);
            expect(result).toBeInstanceOf(DateTime);
            expect(result.valueOf()).toBe(dt.valueOf() + 2 * 60 * 60 * 1000);
         });

         it("should handle negative values", () => {
            const dt = new DateTime("2024-01-15T10:30:00.000Z");
            const result = dt.addHours(-2);
            expect(result.valueOf()).toBe(dt.valueOf() - 2 * 60 * 60 * 1000);
         });

         it("should handle daylight saving time transitions", () => {
            const dt = new DateTime("2024-01-15T10:30:00.000Z");
            const result = dt.addHours(24);
            expect(result.valueOf()).toBe(dt.valueOf() + 24 * 60 * 60 * 1000);
         });
      });

      describe("addDays()", () => {
         it("should add days and return new DateTime", () => {
            const dt = new DateTime("2024-01-15T10:30:00.000Z");
            const result = dt.addDays(5);
            expect(result).toBeInstanceOf(DateTime);
            expect(result.toISO()).toBe("2024-01-20T10:30:00.000Z");
         });

         it("should handle negative values", () => {
            const dt = new DateTime("2024-01-15T10:30:00.000Z");
            const result = dt.addDays(-5);
            expect(result.toISO()).toBe("2024-01-10T10:30:00.000Z");
         });

         it("should handle month boundaries", () => {
            const dt = new DateTime("2024-01-30T10:30:00.000Z");
            const result = dt.addDays(5);
            expect(result.toISO()).toBe("2024-02-04T10:30:00.000Z");
         });

         it("should handle year boundaries", () => {
            const dt = new DateTime("2024-12-30T10:30:00.000Z");
            const result = dt.addDays(5);
            expect(result.toISO()).toBe("2025-01-04T10:30:00.000Z");
         });
      });

      describe("addWeeks()", () => {
         it("should add weeks and return new DateTime", () => {
            const dt = new DateTime("2024-01-15T10:30:00.000Z");
            const result = dt.addWeeks(2);
            expect(result).toBeInstanceOf(DateTime);
            expect(result.toISO()).toBe("2024-01-29T10:30:00.000Z");
         });

         it("should handle negative values", () => {
            const dt = new DateTime("2024-01-15T10:30:00.000Z");
            const result = dt.addWeeks(-2);
            expect(result.toISO()).toBe("2024-01-01T10:30:00.000Z");
         });

         it("should handle month boundaries", () => {
            const dt = new DateTime("2024-01-25T10:30:00.000Z");
            const result = dt.addWeeks(2);
            expect(result.toISO()).toBe("2024-02-08T10:30:00.000Z");
         });
      });

      describe("addMonths()", () => {
         it("should add months and return new DateTime", () => {
            const dt = new DateTime("2024-01-15T10:30:00.000Z");
            const result = dt.addMonths(2);
            expect(result).toBeInstanceOf(DateTime);
            expect(result.toISO()).toBe("2024-03-15T10:30:00.000Z");
         });

         it("should handle negative values", () => {
            const dt = new DateTime("2024-03-15T10:30:00.000Z");
            const result = dt.addMonths(-2);
            expect(result.toISO()).toBe("2024-01-15T10:30:00.000Z");
         });

         it("should handle year boundaries", () => {
            const dt = new DateTime("2024-11-15T10:30:00.000Z");
            const result = dt.addMonths(3);
            expect(result.toISO()).toBe("2025-02-15T10:30:00.000Z");
         });

         it("should handle day overflow (Jan 31 -> Feb 28/29)", () => {
            const dt = new DateTime("2024-01-31T10:30:00.000Z");
            const result = dt.addMonths(1);
            // JavaScript Date automatically adjusts - Jan 31 + 1 month = Mar 2 (since Feb 29 exists but Jan has 31 days)
            expect(result.toISO()).toBe("2024-03-02T10:30:00.000Z");
         });

         it("should handle day overflow in non-leap year", () => {
            const dt = new DateTime("2025-01-31T10:30:00.000Z");
            const result = dt.addMonths(1);
            // JavaScript Date automatically adjusts - Jan 31 + 1 month = Mar 3 (since Feb has only 28 days)
            expect(result.toISO()).toBe("2025-03-03T10:30:00.000Z");
         });

         it("should handle multiple month overflow", () => {
            const dt = new DateTime("2024-01-31T10:30:00.000Z");
            const result = dt.addMonths(13);
            // 13 months from Jan 31, 2024 = Feb 31, 2025 -> Mar 3, 2025
            expect(result.toISO()).toBe("2025-03-03T10:30:00.000Z");
         });
      });

      describe("addYears()", () => {
         it("should add years and return new DateTime", () => {
            const dt = new DateTime("2024-01-15T10:30:00.000Z");
            const result = dt.addYears(2);
            expect(result).toBeInstanceOf(DateTime);
            expect(result.toISO()).toBe("2026-01-15T10:30:00.000Z");
         });

         it("should handle negative values", () => {
            const dt = new DateTime("2024-01-15T10:30:00.000Z");
            const result = dt.addYears(-2);
            expect(result.toISO()).toBe("2022-01-15T10:30:00.000Z");
         });

         it("should handle leap year to non-leap year (Feb 29 -> Feb 28)", () => {
            const dt = new DateTime("2024-02-29T10:30:00.000Z");
            const result = dt.addYears(1);
            // JavaScript Date automatically adjusts Feb 29 -> Mar 1 in non-leap year
            expect(result.toISO()).toBe("2025-03-01T10:30:00.000Z");
         });

         it("should handle large year additions", () => {
            const dt = new DateTime("2024-01-15T10:30:00.000Z");
            const result = dt.addYears(100);
            expect(result.toISO()).toBe("2124-01-15T10:30:00.000Z");
         });
      });

      describe("subtractMilliseconds()", () => {
         it("should subtract milliseconds and return new DateTime", () => {
            const dt = new DateTime("2024-01-15T10:30:00.500Z");
            const result = dt.subtractMilliseconds(500);
            expect(result).toBeInstanceOf(DateTime);
            expect(result.valueOf()).toBe(dt.valueOf() - 500);
         });

         it("should handle negative values (effectively adds)", () => {
            const dt = new DateTime("2024-01-15T10:30:00.000Z");
            const result = dt.subtractMilliseconds(-500);
            expect(result.valueOf()).toBe(dt.valueOf() + 500);
         });
      });

      describe("subtractSeconds()", () => {
         it("should subtract seconds and return new DateTime", () => {
            const dt = new DateTime("2024-01-15T10:30:30.000Z");
            const result = dt.subtractSeconds(30);
            expect(result).toBeInstanceOf(DateTime);
            expect(result.valueOf()).toBe(dt.valueOf() - 30000);
         });

         it("should handle negative values", () => {
            const dt = new DateTime("2024-01-15T10:30:00.000Z");
            const result = dt.subtractSeconds(-30);
            expect(result.valueOf()).toBe(dt.valueOf() + 30000);
         });
      });

      describe("subtractMinutes()", () => {
         it("should subtract minutes and return new DateTime", () => {
            const dt = new DateTime("2024-01-15T10:30:00.000Z");
            const result = dt.subtractMinutes(15);
            expect(result).toBeInstanceOf(DateTime);
            expect(result.valueOf()).toBe(dt.valueOf() - 15 * 60 * 1000);
         });

         it("should handle negative values", () => {
            const dt = new DateTime("2024-01-15T10:30:00.000Z");
            const result = dt.subtractMinutes(-15);
            expect(result.valueOf()).toBe(dt.valueOf() + 15 * 60 * 1000);
         });
      });

      describe("subtractHours()", () => {
         it("should subtract hours and return new DateTime", () => {
            const dt = new DateTime("2024-01-15T10:30:00.000Z");
            const result = dt.subtractHours(2);
            expect(result).toBeInstanceOf(DateTime);
            expect(result.valueOf()).toBe(dt.valueOf() - 2 * 60 * 60 * 1000);
         });

         it("should handle negative values", () => {
            const dt = new DateTime("2024-01-15T10:30:00.000Z");
            const result = dt.subtractHours(-2);
            expect(result.valueOf()).toBe(dt.valueOf() + 2 * 60 * 60 * 1000);
         });
      });

      describe("subtractDays()", () => {
         it("should subtract days and return new DateTime", () => {
            const dt = new DateTime("2024-01-15T10:30:00.000Z");
            const result = dt.subtractDays(5);
            expect(result).toBeInstanceOf(DateTime);
            expect(result.toISO()).toBe("2024-01-10T10:30:00.000Z");
         });

         it("should handle negative values", () => {
            const dt = new DateTime("2024-01-15T10:30:00.000Z");
            const result = dt.subtractDays(-5);
            expect(result.toISO()).toBe("2024-01-20T10:30:00.000Z");
         });

         it("should handle month boundaries", () => {
            const dt = new DateTime("2024-02-05T10:30:00.000Z");
            const result = dt.subtractDays(10);
            expect(result.toISO()).toBe("2024-01-26T10:30:00.000Z");
         });
      });

      describe("subtractWeeks()", () => {
         it("should subtract weeks and return new DateTime", () => {
            const dt = new DateTime("2024-01-29T10:30:00.000Z");
            const result = dt.subtractWeeks(2);
            expect(result).toBeInstanceOf(DateTime);
            expect(result.toISO()).toBe("2024-01-15T10:30:00.000Z");
         });

         it("should handle negative values", () => {
            const dt = new DateTime("2024-01-15T10:30:00.000Z");
            const result = dt.subtractWeeks(-2);
            expect(result.toISO()).toBe("2024-01-29T10:30:00.000Z");
         });
      });

      describe("subtractMonths()", () => {
         it("should subtract months and return new DateTime", () => {
            const dt = new DateTime("2024-03-15T10:30:00.000Z");
            const result = dt.subtractMonths(2);
            expect(result).toBeInstanceOf(DateTime);
            expect(result.toISO()).toBe("2024-01-15T10:30:00.000Z");
         });

         it("should handle negative values", () => {
            const dt = new DateTime("2024-01-15T10:30:00.000Z");
            const result = dt.subtractMonths(-2);
            expect(result.toISO()).toBe("2024-03-15T10:30:00.000Z");
         });

         it("should handle year boundaries", () => {
            const dt = new DateTime("2024-02-15T10:30:00.000Z");
            const result = dt.subtractMonths(3);
            expect(result.toISO()).toBe("2023-11-15T10:30:00.000Z");
         });

         it("should handle day overflow", () => {
            const dt = new DateTime("2024-03-31T10:30:00.000Z");
            const result = dt.subtractMonths(1);
            // JavaScript Date automatically adjusts Mar 31 -> Feb 31 -> Mar 2
            expect(result.toISO()).toBe("2024-03-02T10:30:00.000Z");
         });
      });

      describe("subtractYears()", () => {
         it("should subtract years and return new DateTime", () => {
            const dt = new DateTime("2024-01-15T10:30:00.000Z");
            const result = dt.subtractYears(2);
            expect(result).toBeInstanceOf(DateTime);
            expect(result.toISO()).toBe("2022-01-15T10:30:00.000Z");
         });

         it("should handle negative values", () => {
            const dt = new DateTime("2024-01-15T10:30:00.000Z");
            const result = dt.subtractYears(-2);
            expect(result.toISO()).toBe("2026-01-15T10:30:00.000Z");
         });

         it("should handle leap year to non-leap year", () => {
            const dt = new DateTime("2024-02-29T10:30:00.000Z");
            const result = dt.subtractYears(1);
            // JavaScript Date automatically adjusts Feb 29 -> Mar 1 in non-leap year
            expect(result.toISO()).toBe("2023-03-01T10:30:00.000Z");
         });
      });

      describe("Chaining arithmetic operations", () => {
         it("should allow chaining multiple operations", () => {
            const dt = new DateTime("2024-01-15T10:30:00.000Z");
            const result = dt
               .addDays(5)
               .addHours(2)
               .addMinutes(30)
               .subtractSeconds(15);
            expect(result).toBeInstanceOf(DateTime);
            // 10:30 + 2h = 12:30, + 30m = 13:00, - 15s = 12:59:45
            expect(result.toISO()).toBe("2024-01-20T12:59:45.000Z");
         });

         it("should maintain immutability during chaining", () => {
            const dt = new DateTime("2024-01-15T10:30:00.000Z");
            const original = dt.valueOf();
            dt.addDays(5).addHours(2);
            expect(dt.valueOf()).toBe(original); // Original unchanged
         });
      });

      describe("Edge cases", () => {
         it("should handle invalid dates", () => {
            const dt = new DateTime("invalid");
            const result = dt.addDays(1);
            expect(result.isValid()).toBe(false);
         });

         it("should handle very large numbers", () => {
            const dt = new DateTime("2024-01-15T10:30:00.000Z");
            const result = dt.addDays(10000);
            expect(result.isValid()).toBe(true);
         });

         it("should handle floating point numbers", () => {
            const dt = new DateTime("2024-01-15T10:30:00.000Z");
            const result = dt.addMilliseconds(123.456);
            // JavaScript Date truncates to integer milliseconds
            expect(result.valueOf()).toBe(dt.valueOf() + 123);
         });
      });
   });

   describe("Comparison Methods", () => {
      describe("isBefore()", () => {
         it("should return true when date is before other", () => {
            const dt1 = new DateTime("2024-01-15T10:00:00.000Z");
            const dt2 = new DateTime("2024-01-15T11:00:00.000Z");
            expect(dt1.isBefore(dt2)).toBe(true);
         });

         it("should return false when date is after other", () => {
            const dt1 = new DateTime("2024-01-15T11:00:00.000Z");
            const dt2 = new DateTime("2024-01-15T10:00:00.000Z");
            expect(dt1.isBefore(dt2)).toBe(false);
         });

         it("should return false when dates are equal", () => {
            const dt1 = new DateTime("2024-01-15T10:00:00.000Z");
            const dt2 = new DateTime("2024-01-15T10:00:00.000Z");
            expect(dt1.isBefore(dt2)).toBe(false);
         });

         it("should work with millisecond precision", () => {
            const dt1 = new DateTime("2024-01-15T10:00:00.000Z");
            const dt2 = new DateTime("2024-01-15T10:00:00.001Z");
            expect(dt1.isBefore(dt2)).toBe(true);
            expect(dt2.isBefore(dt1)).toBe(false);
         });

         it("should accept DateTime instance", () => {
            const dt1 = new DateTime("2024-01-15T10:00:00.000Z");
            const dt2 = new DateTime("2024-01-15T11:00:00.000Z");
            expect(dt1.isBefore(dt2)).toBe(true);
         });
      });

      describe("isAfter()", () => {
         it("should return true when date is after other", () => {
            const dt1 = new DateTime("2024-01-15T11:00:00.000Z");
            const dt2 = new DateTime("2024-01-15T10:00:00.000Z");
            expect(dt1.isAfter(dt2)).toBe(true);
         });

         it("should return false when date is before other", () => {
            const dt1 = new DateTime("2024-01-15T10:00:00.000Z");
            const dt2 = new DateTime("2024-01-15T11:00:00.000Z");
            expect(dt1.isAfter(dt2)).toBe(false);
         });

         it("should return false when dates are equal", () => {
            const dt1 = new DateTime("2024-01-15T10:00:00.000Z");
            const dt2 = new DateTime("2024-01-15T10:00:00.000Z");
            expect(dt1.isAfter(dt2)).toBe(false);
         });

         it("should work with millisecond precision", () => {
            const dt1 = new DateTime("2024-01-15T10:00:00.001Z");
            const dt2 = new DateTime("2024-01-15T10:00:00.000Z");
            expect(dt1.isAfter(dt2)).toBe(true);
            expect(dt2.isAfter(dt1)).toBe(false);
         });

         it("should accept DateTime instance", () => {
            const dt1 = new DateTime("2024-01-15T11:00:00.000Z");
            const dt2 = new DateTime("2024-01-15T10:00:00.000Z");
            expect(dt1.isAfter(dt2)).toBe(true);
         });
      });

      describe("isSame()", () => {
         it("should return true when dates are equal", () => {
            const dt1 = new DateTime("2024-01-15T10:00:00.000Z");
            const dt2 = new DateTime("2024-01-15T10:00:00.000Z");
            expect(dt1.isSame(dt2)).toBe(true);
         });

         it("should return false when dates are different", () => {
            const dt1 = new DateTime("2024-01-15T10:00:00.000Z");
            const dt2 = new DateTime("2024-01-15T10:00:00.001Z");
            expect(dt1.isSame(dt2)).toBe(false);
         });

         it("should work with millisecond precision", () => {
            const dt1 = new DateTime("2024-01-15T10:00:00.123Z");
            const dt2 = new DateTime("2024-01-15T10:00:00.123Z");
            expect(dt1.isSame(dt2)).toBe(true);
         });

         it("should return true for same timestamp from different inputs", () => {
            const timestamp = 1705314600000;
            const dt1 = new DateTime(timestamp);
            const dt2 = new DateTime("2024-01-15T10:30:00.000Z");
            expect(dt1.isSame(dt2)).toBe(true);
         });

         it("should accept DateTime instance", () => {
            const dt1 = new DateTime("2024-01-15T10:00:00.000Z");
            const dt2 = new DateTime("2024-01-15T10:00:00.000Z");
            expect(dt1.isSame(dt2)).toBe(true);
         });
      });

      describe("isSameOrBefore()", () => {
         it("should return true when date is before other", () => {
            const dt1 = new DateTime("2024-01-15T10:00:00.000Z");
            const dt2 = new DateTime("2024-01-15T11:00:00.000Z");
            expect(dt1.isSameOrBefore(dt2)).toBe(true);
         });

         it("should return true when dates are equal", () => {
            const dt1 = new DateTime("2024-01-15T10:00:00.000Z");
            const dt2 = new DateTime("2024-01-15T10:00:00.000Z");
            expect(dt1.isSameOrBefore(dt2)).toBe(true);
         });

         it("should return false when date is after other", () => {
            const dt1 = new DateTime("2024-01-15T11:00:00.000Z");
            const dt2 = new DateTime("2024-01-15T10:00:00.000Z");
            expect(dt1.isSameOrBefore(dt2)).toBe(false);
         });

         it("should work with millisecond precision", () => {
            const dt1 = new DateTime("2024-01-15T10:00:00.000Z");
            const dt2 = new DateTime("2024-01-15T10:00:00.001Z");
            expect(dt1.isSameOrBefore(dt2)).toBe(true);
            expect(dt1.isSameOrBefore(dt1)).toBe(true);
         });

         it("should accept DateTime instance", () => {
            const dt1 = new DateTime("2024-01-15T10:00:00.000Z");
            const dt2 = new DateTime("2024-01-15T10:00:00.000Z");
            expect(dt1.isSameOrBefore(dt2)).toBe(true);
         });
      });

      describe("isSameOrAfter()", () => {
         it("should return true when date is after other", () => {
            const dt1 = new DateTime("2024-01-15T11:00:00.000Z");
            const dt2 = new DateTime("2024-01-15T10:00:00.000Z");
            expect(dt1.isSameOrAfter(dt2)).toBe(true);
         });

         it("should return true when dates are equal", () => {
            const dt1 = new DateTime("2024-01-15T10:00:00.000Z");
            const dt2 = new DateTime("2024-01-15T10:00:00.000Z");
            expect(dt1.isSameOrAfter(dt2)).toBe(true);
         });

         it("should return false when date is before other", () => {
            const dt1 = new DateTime("2024-01-15T10:00:00.000Z");
            const dt2 = new DateTime("2024-01-15T11:00:00.000Z");
            expect(dt1.isSameOrAfter(dt2)).toBe(false);
         });

         it("should work with millisecond precision", () => {
            const dt1 = new DateTime("2024-01-15T10:00:00.001Z");
            const dt2 = new DateTime("2024-01-15T10:00:00.000Z");
            expect(dt1.isSameOrAfter(dt2)).toBe(true);
            expect(dt1.isSameOrAfter(dt1)).toBe(true);
         });

         it("should accept DateTime instance", () => {
            const dt1 = new DateTime("2024-01-15T11:00:00.000Z");
            const dt2 = new DateTime("2024-01-15T10:00:00.000Z");
            expect(dt1.isSameOrAfter(dt2)).toBe(true);
         });
      });

      describe("isBetween()", () => {
         it("should return true when date is between start and end (exclusive)", () => {
            const dt = new DateTime("2024-01-15T11:00:00.000Z");
            const start = new DateTime("2024-01-15T10:00:00.000Z");
            const end = new DateTime("2024-01-15T12:00:00.000Z");
            expect(dt.isBetween(start, end)).toBe(true);
         });

         it("should return false when date equals start (exclusive)", () => {
            const dt = new DateTime("2024-01-15T10:00:00.000Z");
            const start = new DateTime("2024-01-15T10:00:00.000Z");
            const end = new DateTime("2024-01-15T12:00:00.000Z");
            expect(dt.isBetween(start, end)).toBe(false);
         });

         it("should return false when date equals end (exclusive)", () => {
            const dt = new DateTime("2024-01-15T12:00:00.000Z");
            const start = new DateTime("2024-01-15T10:00:00.000Z");
            const end = new DateTime("2024-01-15T12:00:00.000Z");
            expect(dt.isBetween(start, end)).toBe(false);
         });

         it("should return false when date is before start (exclusive)", () => {
            const dt = new DateTime("2024-01-15T09:00:00.000Z");
            const start = new DateTime("2024-01-15T10:00:00.000Z");
            const end = new DateTime("2024-01-15T12:00:00.000Z");
            expect(dt.isBetween(start, end)).toBe(false);
         });

         it("should return false when date is after end (exclusive)", () => {
            const dt = new DateTime("2024-01-15T13:00:00.000Z");
            const start = new DateTime("2024-01-15T10:00:00.000Z");
            const end = new DateTime("2024-01-15T12:00:00.000Z");
            expect(dt.isBetween(start, end)).toBe(false);
         });

         it("should return true when date is between start and end (inclusive)", () => {
            const dt = new DateTime("2024-01-15T11:00:00.000Z");
            const start = new DateTime("2024-01-15T10:00:00.000Z");
            const end = new DateTime("2024-01-15T12:00:00.000Z");
            expect(dt.isBetween(start, end, true)).toBe(true);
         });

         it("should return true when date equals start (inclusive)", () => {
            const dt = new DateTime("2024-01-15T10:00:00.000Z");
            const start = new DateTime("2024-01-15T10:00:00.000Z");
            const end = new DateTime("2024-01-15T12:00:00.000Z");
            expect(dt.isBetween(start, end, true)).toBe(true);
         });

         it("should return true when date equals end (inclusive)", () => {
            const dt = new DateTime("2024-01-15T12:00:00.000Z");
            const start = new DateTime("2024-01-15T10:00:00.000Z");
            const end = new DateTime("2024-01-15T12:00:00.000Z");
            expect(dt.isBetween(start, end, true)).toBe(true);
         });

         it("should return false when date is before start (inclusive)", () => {
            const dt = new DateTime("2024-01-15T09:00:00.000Z");
            const start = new DateTime("2024-01-15T10:00:00.000Z");
            const end = new DateTime("2024-01-15T12:00:00.000Z");
            expect(dt.isBetween(start, end, true)).toBe(false);
         });

         it("should return false when date is after end (inclusive)", () => {
            const dt = new DateTime("2024-01-15T13:00:00.000Z");
            const start = new DateTime("2024-01-15T10:00:00.000Z");
            const end = new DateTime("2024-01-15T12:00:00.000Z");
            expect(dt.isBetween(start, end, true)).toBe(false);
         });

         it("should work with millisecond precision (exclusive)", () => {
            const dt = new DateTime("2024-01-15T10:00:00.001Z");
            const start = new DateTime("2024-01-15T10:00:00.000Z");
            const end = new DateTime("2024-01-15T10:00:00.002Z");
            expect(dt.isBetween(start, end)).toBe(true);
         });

         it("should work with millisecond precision (inclusive)", () => {
            const dt = new DateTime("2024-01-15T10:00:00.000Z");
            const start = new DateTime("2024-01-15T10:00:00.000Z");
            const end = new DateTime("2024-01-15T10:00:00.002Z");
            expect(dt.isBetween(start, end, true)).toBe(true);
         });

         it("should accept DateTime instances", () => {
            const dt = new DateTime("2024-01-15T11:00:00.000Z");
            const start = new DateTime("2024-01-15T10:00:00.000Z");
            const end = new DateTime("2024-01-15T12:00:00.000Z");
            expect(dt.isBetween(start, end)).toBe(true);
         });

         it("should default to exclusive when inclusive parameter is not provided", () => {
            const dt = new DateTime("2024-01-15T10:00:00.000Z");
            const start = new DateTime("2024-01-15T10:00:00.000Z");
            const end = new DateTime("2024-01-15T12:00:00.000Z");
            expect(dt.isBetween(start, end)).toBe(false);
         });
      });
   });

   describe("Getter Methods", () => {
      describe("year()", () => {
         it("should return the UTC year", () => {
            const dt = new DateTime("2024-01-15T10:30:45.123Z");
            expect(dt.year()).toBe(2024);
         });

         it("should return correct year for different dates", () => {
            expect(new DateTime("2025-12-31T23:59:59.999Z").year()).toBe(2025);
            expect(new DateTime("2000-01-01T00:00:00.000Z").year()).toBe(2000);
         });
      });

      describe("month()", () => {
         it("should return the UTC month (0-indexed)", () => {
            const dt = new DateTime("2024-01-15T10:30:45.123Z");
            expect(dt.month()).toBe(0); // January
         });

         it("should return correct month for different dates", () => {
            expect(new DateTime("2024-02-15T10:30:00.000Z").month()).toBe(1); // February
            expect(new DateTime("2024-12-15T10:30:00.000Z").month()).toBe(11); // December
         });
      });

      describe("date()", () => {
         it("should return the UTC day of month", () => {
            const dt = new DateTime("2024-01-15T10:30:45.123Z");
            expect(dt.date()).toBe(15);
         });

         it("should return correct date for different days", () => {
            expect(new DateTime("2024-01-01T10:30:00.000Z").date()).toBe(1);
            expect(new DateTime("2024-01-31T10:30:00.000Z").date()).toBe(31);
         });
      });

      describe("day()", () => {
         it("should return the UTC day of week (0-indexed, 0=Sunday)", () => {
            const dt = new DateTime("2024-01-15T10:30:45.123Z"); // Monday
            expect(dt.day()).toBe(1);
         });

         it("should return correct day for different days of week", () => {
            expect(new DateTime("2024-01-14T10:30:00.000Z").day()).toBe(0); // Sunday
            expect(new DateTime("2024-01-20T10:30:00.000Z").day()).toBe(6); // Saturday
         });
      });

      describe("hour()", () => {
         it("should return the UTC hour", () => {
            const dt = new DateTime("2024-01-15T10:30:45.123Z");
            expect(dt.hour()).toBe(10);
         });

         it("should return correct hour for different times", () => {
            expect(new DateTime("2024-01-15T00:30:00.000Z").hour()).toBe(0);
            expect(new DateTime("2024-01-15T23:30:00.000Z").hour()).toBe(23);
         });
      });

      describe("minute()", () => {
         it("should return the UTC minute", () => {
            const dt = new DateTime("2024-01-15T10:30:45.123Z");
            expect(dt.minute()).toBe(30);
         });

         it("should return correct minute for different times", () => {
            expect(new DateTime("2024-01-15T10:00:00.000Z").minute()).toBe(0);
            expect(new DateTime("2024-01-15T10:59:00.000Z").minute()).toBe(59);
         });
      });

      describe("second()", () => {
         it("should return the UTC second", () => {
            const dt = new DateTime("2024-01-15T10:30:45.123Z");
            expect(dt.second()).toBe(45);
         });

         it("should return correct second for different times", () => {
            expect(new DateTime("2024-01-15T10:30:00.000Z").second()).toBe(0);
            expect(new DateTime("2024-01-15T10:30:59.000Z").second()).toBe(59);
         });
      });

      describe("millisecond()", () => {
         it("should return the UTC millisecond", () => {
            const dt = new DateTime("2024-01-15T10:30:45.123Z");
            expect(dt.millisecond()).toBe(123);
         });

         it("should return correct millisecond for different times", () => {
            expect(new DateTime("2024-01-15T10:30:45.000Z").millisecond()).toBe(
               0,
            );
            expect(new DateTime("2024-01-15T10:30:45.999Z").millisecond()).toBe(
               999,
            );
         });
      });
   });

   describe("Setter Methods", () => {
      describe("setYear()", () => {
         it("should return new DateTime with updated year", () => {
            const dt = new DateTime("2024-01-15T10:30:45.123Z");
            const result = dt.setYear(2025);
            expect(result).toBeInstanceOf(DateTime);
            expect(result.year()).toBe(2025);
            expect(result.toISO()).toBe("2025-01-15T10:30:45.123Z");
         });

         it("should not modify original DateTime", () => {
            const dt = new DateTime("2024-01-15T10:30:45.123Z");
            const original = dt.toISO();
            dt.setYear(2025);
            expect(dt.toISO()).toBe(original);
         });
      });

      describe("setMonth()", () => {
         it("should return new DateTime with updated month", () => {
            const dt = new DateTime("2024-01-15T10:30:45.123Z");
            const result = dt.setMonth(5); // June (0-indexed)
            expect(result).toBeInstanceOf(DateTime);
            expect(result.month()).toBe(5);
            expect(result.toISO()).toBe("2024-06-15T10:30:45.123Z");
         });

         it("should not modify original DateTime", () => {
            const dt = new DateTime("2024-01-15T10:30:45.123Z");
            const original = dt.toISO();
            dt.setMonth(5);
            expect(dt.toISO()).toBe(original);
         });

         it("should handle day overflow", () => {
            const dt = new DateTime("2024-01-31T10:30:45.123Z");
            const result = dt.setMonth(1); // February
            // Jan 31 -> Feb 31 -> Mar 2 (2024 is leap year, Feb has 29 days)
            expect(result.toISO()).toBe("2024-03-02T10:30:45.123Z");
         });
      });

      describe("setDate()", () => {
         it("should return new DateTime with updated date", () => {
            const dt = new DateTime("2024-01-15T10:30:45.123Z");
            const result = dt.setDate(25);
            expect(result).toBeInstanceOf(DateTime);
            expect(result.date()).toBe(25);
            expect(result.toISO()).toBe("2024-01-25T10:30:45.123Z");
         });

         it("should not modify original DateTime", () => {
            const dt = new DateTime("2024-01-15T10:30:45.123Z");
            const original = dt.toISO();
            dt.setDate(25);
            expect(dt.toISO()).toBe(original);
         });

         it("should handle day overflow", () => {
            const dt = new DateTime("2024-01-15T10:30:45.123Z");
            const result = dt.setDate(32);
            // Jan 32 -> Feb 1
            expect(result.toISO()).toBe("2024-02-01T10:30:45.123Z");
         });
      });

      describe("setHour()", () => {
         it("should return new DateTime with updated hour", () => {
            const dt = new DateTime("2024-01-15T10:30:45.123Z");
            const result = dt.setHour(15);
            expect(result).toBeInstanceOf(DateTime);
            expect(result.hour()).toBe(15);
            expect(result.toISO()).toBe("2024-01-15T15:30:45.123Z");
         });

         it("should not modify original DateTime", () => {
            const dt = new DateTime("2024-01-15T10:30:45.123Z");
            const original = dt.toISO();
            dt.setHour(15);
            expect(dt.toISO()).toBe(original);
         });

         it("should handle hour overflow", () => {
            const dt = new DateTime("2024-01-15T10:30:45.123Z");
            const result = dt.setHour(25);
            // Hour 25 -> next day, hour 1
            expect(result.toISO()).toBe("2024-01-16T01:30:45.123Z");
         });
      });

      describe("setMinute()", () => {
         it("should return new DateTime with updated minute", () => {
            const dt = new DateTime("2024-01-15T10:30:45.123Z");
            const result = dt.setMinute(45);
            expect(result).toBeInstanceOf(DateTime);
            expect(result.minute()).toBe(45);
            expect(result.toISO()).toBe("2024-01-15T10:45:45.123Z");
         });

         it("should not modify original DateTime", () => {
            const dt = new DateTime("2024-01-15T10:30:45.123Z");
            const original = dt.toISO();
            dt.setMinute(45);
            expect(dt.toISO()).toBe(original);
         });

         it("should handle minute overflow", () => {
            const dt = new DateTime("2024-01-15T10:30:45.123Z");
            const result = dt.setMinute(65);
            // Minute 65 -> next hour, minute 5
            expect(result.toISO()).toBe("2024-01-15T11:05:45.123Z");
         });
      });

      describe("setSecond()", () => {
         it("should return new DateTime with updated second", () => {
            const dt = new DateTime("2024-01-15T10:30:45.123Z");
            const result = dt.setSecond(30);
            expect(result).toBeInstanceOf(DateTime);
            expect(result.second()).toBe(30);
            expect(result.toISO()).toBe("2024-01-15T10:30:30.123Z");
         });

         it("should not modify original DateTime", () => {
            const dt = new DateTime("2024-01-15T10:30:45.123Z");
            const original = dt.toISO();
            dt.setSecond(30);
            expect(dt.toISO()).toBe(original);
         });

         it("should handle second overflow", () => {
            const dt = new DateTime("2024-01-15T10:30:45.123Z");
            const result = dt.setSecond(65);
            // Second 65 -> next minute, second 5
            expect(result.toISO()).toBe("2024-01-15T10:31:05.123Z");
         });
      });

      describe("setMillisecond()", () => {
         it("should return new DateTime with updated millisecond", () => {
            const dt = new DateTime("2024-01-15T10:30:45.123Z");
            const result = dt.setMillisecond(456);
            expect(result).toBeInstanceOf(DateTime);
            expect(result.millisecond()).toBe(456);
            expect(result.toISO()).toBe("2024-01-15T10:30:45.456Z");
         });

         it("should not modify original DateTime", () => {
            const dt = new DateTime("2024-01-15T10:30:45.123Z");
            const original = dt.toISO();
            dt.setMillisecond(456);
            expect(dt.toISO()).toBe(original);
         });

         it("should handle millisecond overflow", () => {
            const dt = new DateTime("2024-01-15T10:30:45.123Z");
            const result = dt.setMillisecond(1500);
            // Millisecond 1500 -> next second, millisecond 500
            expect(result.toISO()).toBe("2024-01-15T10:30:46.500Z");
         });
      });
   });

   describe("Start/End Methods", () => {
      describe("startOfDay()", () => {
         it("should return new DateTime at start of day (00:00:00.000)", () => {
            const dt = new DateTime("2024-01-15T10:30:45.123Z");
            const result = dt.startOfDay();
            expect(result).toBeInstanceOf(DateTime);
            expect(result.toISO()).toBe("2024-01-15T00:00:00.000Z");
         });

         it("should not modify original DateTime", () => {
            const dt = new DateTime("2024-01-15T10:30:45.123Z");
            const original = dt.toISO();
            dt.startOfDay();
            expect(dt.toISO()).toBe(original);
         });
      });

      describe("endOfDay()", () => {
         it("should return new DateTime at end of day (23:59:59.999)", () => {
            const dt = new DateTime("2024-01-15T10:30:45.123Z");
            const result = dt.endOfDay();
            expect(result).toBeInstanceOf(DateTime);
            expect(result.toISO()).toBe("2024-01-15T23:59:59.999Z");
         });

         it("should not modify original DateTime", () => {
            const dt = new DateTime("2024-01-15T10:30:45.123Z");
            const original = dt.toISO();
            dt.endOfDay();
            expect(dt.toISO()).toBe(original);
         });
      });

      describe("startOfHour()", () => {
         it("should return new DateTime at start of hour (XX:00:00.000)", () => {
            const dt = new DateTime("2024-01-15T10:30:45.123Z");
            const result = dt.startOfHour();
            expect(result).toBeInstanceOf(DateTime);
            expect(result.toISO()).toBe("2024-01-15T10:00:00.000Z");
         });

         it("should not modify original DateTime", () => {
            const dt = new DateTime("2024-01-15T10:30:45.123Z");
            const original = dt.toISO();
            dt.startOfHour();
            expect(dt.toISO()).toBe(original);
         });
      });

      describe("endOfHour()", () => {
         it("should return new DateTime at end of hour (XX:59:59.999)", () => {
            const dt = new DateTime("2024-01-15T10:30:45.123Z");
            const result = dt.endOfHour();
            expect(result).toBeInstanceOf(DateTime);
            expect(result.toISO()).toBe("2024-01-15T10:59:59.999Z");
         });

         it("should not modify original DateTime", () => {
            const dt = new DateTime("2024-01-15T10:30:45.123Z");
            const original = dt.toISO();
            dt.endOfHour();
            expect(dt.toISO()).toBe(original);
         });
      });

      describe("startOfWeek()", () => {
         it("should return new DateTime at start of week (Sunday 00:00:00.000)", () => {
            const dt = new DateTime("2024-01-15T10:30:45.123Z"); // Monday
            const result = dt.startOfWeek();
            expect(result).toBeInstanceOf(DateTime);
            // Previous Sunday is Jan 14
            expect(result.toISO()).toBe("2024-01-14T00:00:00.000Z");
            expect(result.day()).toBe(0); // Sunday
         });

         it("should handle when day is already Sunday", () => {
            const dt = new DateTime("2024-01-14T10:30:45.123Z"); // Sunday
            const result = dt.startOfWeek();
            expect(result.toISO()).toBe("2024-01-14T00:00:00.000Z");
            expect(result.day()).toBe(0); // Sunday
         });

         it("should not modify original DateTime", () => {
            const dt = new DateTime("2024-01-15T10:30:45.123Z");
            const original = dt.toISO();
            dt.startOfWeek();
            expect(dt.toISO()).toBe(original);
         });
      });

      describe("endOfWeek()", () => {
         it("should return new DateTime at end of week (Saturday 23:59:59.999)", () => {
            const dt = new DateTime("2024-01-15T10:30:45.123Z"); // Monday
            const result = dt.endOfWeek();
            expect(result).toBeInstanceOf(DateTime);
            // Next Saturday is Jan 20
            expect(result.toISO()).toBe("2024-01-20T23:59:59.999Z");
            expect(result.day()).toBe(6); // Saturday
         });

         it("should handle when day is already Saturday", () => {
            const dt = new DateTime("2024-01-20T10:30:45.123Z"); // Saturday
            const result = dt.endOfWeek();
            expect(result.toISO()).toBe("2024-01-20T23:59:59.999Z");
            expect(result.day()).toBe(6); // Saturday
         });

         it("should not modify original DateTime", () => {
            const dt = new DateTime("2024-01-15T10:30:45.123Z");
            const original = dt.toISO();
            dt.endOfWeek();
            expect(dt.toISO()).toBe(original);
         });
      });

      describe("startOfMonth()", () => {
         it("should return new DateTime at start of month (day 1, 00:00:00.000)", () => {
            const dt = new DateTime("2024-01-15T10:30:45.123Z");
            const result = dt.startOfMonth();
            expect(result).toBeInstanceOf(DateTime);
            expect(result.toISO()).toBe("2024-01-01T00:00:00.000Z");
         });

         it("should handle when day is already 1st", () => {
            const dt = new DateTime("2024-01-01T10:30:45.123Z");
            const result = dt.startOfMonth();
            expect(result.toISO()).toBe("2024-01-01T00:00:00.000Z");
         });

         it("should not modify original DateTime", () => {
            const dt = new DateTime("2024-01-15T10:30:45.123Z");
            const original = dt.toISO();
            dt.startOfMonth();
            expect(dt.toISO()).toBe(original);
         });
      });

      describe("endOfMonth()", () => {
         it("should return new DateTime at end of month (last day, 23:59:59.999)", () => {
            const dt = new DateTime("2024-01-15T10:30:45.123Z");
            const result = dt.endOfMonth();
            expect(result).toBeInstanceOf(DateTime);
            expect(result.toISO()).toBe("2024-01-31T23:59:59.999Z");
         });

         it("should handle February in leap year", () => {
            const dt = new DateTime("2024-02-15T10:30:45.123Z");
            const result = dt.endOfMonth();
            expect(result.toISO()).toBe("2024-02-29T23:59:59.999Z");
         });

         it("should handle February in non-leap year", () => {
            const dt = new DateTime("2025-02-15T10:30:45.123Z");
            const result = dt.endOfMonth();
            expect(result.toISO()).toBe("2025-02-28T23:59:59.999Z");
         });

         it("should handle 30-day months", () => {
            const dt = new DateTime("2024-04-15T10:30:45.123Z");
            const result = dt.endOfMonth();
            expect(result.toISO()).toBe("2024-04-30T23:59:59.999Z");
         });

         it("should not modify original DateTime", () => {
            const dt = new DateTime("2024-01-15T10:30:45.123Z");
            const original = dt.toISO();
            dt.endOfMonth();
            expect(dt.toISO()).toBe(original);
         });
      });

      describe("startOfYear()", () => {
         it("should return new DateTime at start of year (Jan 1, 00:00:00.000)", () => {
            const dt = new DateTime("2024-06-15T10:30:45.123Z");
            const result = dt.startOfYear();
            expect(result).toBeInstanceOf(DateTime);
            expect(result.toISO()).toBe("2024-01-01T00:00:00.000Z");
         });

         it("should handle when already at start of year", () => {
            const dt = new DateTime("2024-01-01T10:30:45.123Z");
            const result = dt.startOfYear();
            expect(result.toISO()).toBe("2024-01-01T00:00:00.000Z");
         });

         it("should not modify original DateTime", () => {
            const dt = new DateTime("2024-06-15T10:30:45.123Z");
            const original = dt.toISO();
            dt.startOfYear();
            expect(dt.toISO()).toBe(original);
         });
      });

      describe("endOfYear()", () => {
         it("should return new DateTime at end of year (Dec 31, 23:59:59.999)", () => {
            const dt = new DateTime("2024-06-15T10:30:45.123Z");
            const result = dt.endOfYear();
            expect(result).toBeInstanceOf(DateTime);
            expect(result.toISO()).toBe("2024-12-31T23:59:59.999Z");
         });

         it("should handle when already at end of year", () => {
            const dt = new DateTime("2024-12-31T10:30:45.123Z");
            const result = dt.endOfYear();
            expect(result.toISO()).toBe("2024-12-31T23:59:59.999Z");
         });

         it("should not modify original DateTime", () => {
            const dt = new DateTime("2024-06-15T10:30:45.123Z");
            const original = dt.toISO();
            dt.endOfYear();
            expect(dt.toISO()).toBe(original);
         });
      });
   });

   describe("Difference Method", () => {
      describe("diff()", () => {
         it("should calculate difference in milliseconds by default", () => {
            const dt1 = new DateTime("2024-01-15T10:00:00.000Z");
            const dt2 = new DateTime("2024-01-15T10:00:01.500Z");
            expect(dt1.diff(dt2)).toBe(-1500);
            expect(dt2.diff(dt1)).toBe(1500);
         });

         it("should calculate difference in seconds", () => {
            const dt1 = new DateTime("2024-01-15T10:00:00.000Z");
            const dt2 = new DateTime("2024-01-15T10:01:30.000Z");
            expect(dt1.diff(dt2, "second")).toBe(-90);
            expect(dt2.diff(dt1, "second")).toBe(90);
         });

         it("should calculate difference in minutes", () => {
            const dt1 = new DateTime("2024-01-15T10:00:00.000Z");
            const dt2 = new DateTime("2024-01-15T11:30:00.000Z");
            expect(dt1.diff(dt2, "minute")).toBe(-90);
            expect(dt2.diff(dt1, "minute")).toBe(90);
         });

         it("should calculate difference in hours", () => {
            const dt1 = new DateTime("2024-01-15T10:00:00.000Z");
            const dt2 = new DateTime("2024-01-15T22:00:00.000Z");
            expect(dt1.diff(dt2, "hour")).toBe(-12);
            expect(dt2.diff(dt1, "hour")).toBe(12);
         });

         it("should calculate difference in days", () => {
            const dt1 = new DateTime("2024-01-15T10:00:00.000Z");
            const dt2 = new DateTime("2024-01-20T10:00:00.000Z");
            expect(dt1.diff(dt2, "day")).toBe(-5);
            expect(dt2.diff(dt1, "day")).toBe(5);
         });

         it("should calculate difference in weeks", () => {
            const dt1 = new DateTime("2024-01-15T10:00:00.000Z");
            const dt2 = new DateTime("2024-01-29T10:00:00.000Z");
            expect(dt1.diff(dt2, "week")).toBe(-2);
            expect(dt2.diff(dt1, "week")).toBe(2);
         });

         it("should calculate difference in months", () => {
            const dt1 = new DateTime("2024-01-15T10:00:00.000Z");
            const dt2 = new DateTime("2024-04-15T10:00:00.000Z");
            expect(dt1.diff(dt2, "month")).toBe(-3);
            expect(dt2.diff(dt1, "month")).toBe(3);
         });

         it("should calculate difference in years", () => {
            const dt1 = new DateTime("2024-01-15T10:00:00.000Z");
            const dt2 = new DateTime("2026-01-15T10:00:00.000Z");
            expect(dt1.diff(dt2, "year")).toBeCloseTo(-2, 1);
            expect(dt2.diff(dt1, "year")).toBeCloseTo(2, 1);
         });

         it("should return 0 for same dates", () => {
            const dt1 = new DateTime("2024-01-15T10:00:00.000Z");
            const dt2 = new DateTime("2024-01-15T10:00:00.000Z");
            expect(dt1.diff(dt2)).toBe(0);
            expect(dt1.diff(dt2, "second")).toBe(0);
            expect(dt1.diff(dt2, "day")).toBe(0);
         });

         it("should handle fractional results for seconds", () => {
            const dt1 = new DateTime("2024-01-15T10:00:00.000Z");
            const dt2 = new DateTime("2024-01-15T10:00:00.500Z");
            expect(dt1.diff(dt2, "second")).toBe(-0.5);
         });

         it("should handle fractional results for minutes", () => {
            const dt1 = new DateTime("2024-01-15T10:00:00.000Z");
            const dt2 = new DateTime("2024-01-15T10:00:30.000Z");
            expect(dt1.diff(dt2, "minute")).toBe(-0.5);
         });

         it("should handle fractional results for hours", () => {
            const dt1 = new DateTime("2024-01-15T10:00:00.000Z");
            const dt2 = new DateTime("2024-01-15T10:30:00.000Z");
            expect(dt1.diff(dt2, "hour")).toBe(-0.5);
         });

         it("should handle fractional results for days", () => {
            const dt1 = new DateTime("2024-01-15T10:00:00.000Z");
            const dt2 = new DateTime("2024-01-15T22:00:00.000Z");
            expect(dt1.diff(dt2, "day")).toBe(-0.5);
         });

         it("should handle month boundaries correctly", () => {
            const dt1 = new DateTime("2024-01-31T10:00:00.000Z");
            const dt2 = new DateTime("2024-02-29T10:00:00.000Z"); // Leap year
            expect(dt1.diff(dt2, "month")).toBe(-1);
         });

         it("should handle year boundaries correctly", () => {
            const dt1 = new DateTime("2023-12-31T10:00:00.000Z");
            const dt2 = new DateTime("2024-01-01T10:00:00.000Z");
            expect(dt1.diff(dt2, "year")).toBeCloseTo(0, 2); // Less than 1 year
         });

         it("should handle leap years in year calculations", () => {
            const dt1 = new DateTime("2024-01-01T00:00:00.000Z");
            const dt2 = new DateTime("2025-01-01T00:00:00.000Z");
            // 366 days in 2024 (leap year)
            expect(dt1.diff(dt2, "year")).toBeCloseTo(-1, 2);
         });

         it("should accept DateTime instance", () => {
            const dt1 = new DateTime("2024-01-15T10:00:00.000Z");
            const dt2 = new DateTime("2024-01-15T11:00:00.000Z");
            expect(dt1.diff(dt2, "hour")).toBe(-1);
         });
      });
   });
});
