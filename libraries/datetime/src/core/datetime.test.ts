import { beforeEach, describe, expect, it } from "vitest";
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
});
