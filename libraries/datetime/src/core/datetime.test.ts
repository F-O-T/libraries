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
});
