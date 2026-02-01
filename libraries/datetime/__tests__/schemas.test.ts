import { describe, expect, it } from "bun:test";
import {
   DateInputSchema,
   DateTimeConfigSchema,
   DateTimePluginSchema,
   FormatOptionsSchema,
   ISODateOnlySchema,
   ISODateSchema,
   ISOTimeOnlySchema,
   ParseOptionsSchema,
   TimeUnitSchema,
} from "../src/schemas";

describe("TimeUnitSchema", () => {
   it("should accept valid time units", () => {
      expect(TimeUnitSchema.parse("millisecond")).toBe("millisecond");
      expect(TimeUnitSchema.parse("second")).toBe("second");
      expect(TimeUnitSchema.parse("minute")).toBe("minute");
      expect(TimeUnitSchema.parse("hour")).toBe("hour");
      expect(TimeUnitSchema.parse("day")).toBe("day");
      expect(TimeUnitSchema.parse("week")).toBe("week");
      expect(TimeUnitSchema.parse("month")).toBe("month");
      expect(TimeUnitSchema.parse("year")).toBe("year");
   });

   it("should reject invalid time units", () => {
      expect(() => TimeUnitSchema.parse("invalid")).toThrow();
      expect(() => TimeUnitSchema.parse("seconds")).toThrow();
      expect(() => TimeUnitSchema.parse("")).toThrow();
   });
});

describe("DateInputSchema", () => {
   it("should accept Date objects", () => {
      const date = new Date();
      expect(DateInputSchema.parse(date)).toBe(date);
   });

   it("should accept strings", () => {
      expect(DateInputSchema.parse("2024-01-15")).toBe("2024-01-15");
      expect(DateInputSchema.parse("2024-01-15T10:30:00Z")).toBe(
         "2024-01-15T10:30:00Z",
      );
   });

   it("should accept numbers", () => {
      expect(DateInputSchema.parse(1705315200000)).toBe(1705315200000);
      expect(DateInputSchema.parse(0)).toBe(0);
   });

   it("should accept DateTime-like objects", () => {
      const dateTimeLike = {
         toDate: () => new Date(),
      } as any;
      expect(DateInputSchema.parse(dateTimeLike)).toBe(dateTimeLike);
   });

   it("should reject invalid inputs", () => {
      expect(() => DateInputSchema.parse(null)).toThrow();
      expect(() => DateInputSchema.parse(undefined)).toThrow();
      expect(() => DateInputSchema.parse({})).toThrow();
      expect(() => DateInputSchema.parse([])).toThrow();
      expect(() => DateInputSchema.parse({ notADateTime: true })).toThrow();
   });
});

describe("DateTimeConfigSchema", () => {
   it("should accept valid config objects", () => {
      expect(
         DateTimeConfigSchema.parse({
            timezone: "America/New_York",
            locale: "en-US",
            utc: false,
            strict: true,
         }),
      ).toEqual({
         timezone: "America/New_York",
         locale: "en-US",
         utc: false,
         strict: true,
      });
   });

   it("should accept partial config objects", () => {
      expect(DateTimeConfigSchema.parse({ timezone: "Europe/London" })).toEqual(
         {
            timezone: "Europe/London",
         },
      );
      expect(DateTimeConfigSchema.parse({ utc: true })).toEqual({ utc: true });
      expect(DateTimeConfigSchema.parse({})).toEqual({});
   });

   it("should reject invalid config objects", () => {
      expect(() => DateTimeConfigSchema.parse({ timezone: 123 })).toThrow();
      expect(() => DateTimeConfigSchema.parse({ locale: true })).toThrow();
      expect(() => DateTimeConfigSchema.parse({ utc: "yes" })).toThrow();
      expect(() => DateTimeConfigSchema.parse({ strict: 1 })).toThrow();
   });
});

describe("FormatOptionsSchema", () => {
   it("should accept valid format options", () => {
      expect(
         FormatOptionsSchema.parse({
            locale: "en-US",
            timezone: "America/New_York",
         }),
      ).toEqual({
         locale: "en-US",
         timezone: "America/New_York",
      });
   });

   it("should accept partial format options", () => {
      expect(FormatOptionsSchema.parse({ locale: "fr-FR" })).toEqual({
         locale: "fr-FR",
      });
      expect(FormatOptionsSchema.parse({ timezone: "Asia/Tokyo" })).toEqual({
         timezone: "Asia/Tokyo",
      });
      expect(FormatOptionsSchema.parse({})).toEqual({});
   });

   it("should reject invalid format options", () => {
      expect(() => FormatOptionsSchema.parse({ locale: 123 })).toThrow();
      expect(() => FormatOptionsSchema.parse({ timezone: false })).toThrow();
   });
});

describe("ParseOptionsSchema", () => {
   it("should accept valid parse options", () => {
      expect(
         ParseOptionsSchema.parse({
            strict: true,
            format: "YYYY-MM-DD",
            timezone: "UTC",
         }),
      ).toEqual({
         strict: true,
         format: "YYYY-MM-DD",
         timezone: "UTC",
      });
   });

   it("should accept partial parse options", () => {
      expect(ParseOptionsSchema.parse({ strict: false })).toEqual({
         strict: false,
      });
      expect(ParseOptionsSchema.parse({ format: "DD/MM/YYYY" })).toEqual({
         format: "DD/MM/YYYY",
      });
      expect(ParseOptionsSchema.parse({})).toEqual({});
   });

   it("should reject invalid parse options", () => {
      expect(() => ParseOptionsSchema.parse({ strict: "yes" })).toThrow();
      expect(() => ParseOptionsSchema.parse({ format: 123 })).toThrow();
      expect(() => ParseOptionsSchema.parse({ timezone: true })).toThrow();
   });
});

describe("ISODateSchema", () => {
   it("should accept valid ISO 8601 datetime strings", () => {
      expect(ISODateSchema.parse("2024-01-15T10:30:00Z")).toBe(
         "2024-01-15T10:30:00Z",
      );
      expect(ISODateSchema.parse("2024-01-15T10:30:00.123Z")).toBe(
         "2024-01-15T10:30:00.123Z",
      );
      expect(ISODateSchema.parse("2024-01-15T10:30:00.12Z")).toBe(
         "2024-01-15T10:30:00.12Z",
      );
      expect(ISODateSchema.parse("2024-01-15T10:30:00.1Z")).toBe(
         "2024-01-15T10:30:00.1Z",
      );
      expect(ISODateSchema.parse("2024-01-15T10:30:00+05:30")).toBe(
         "2024-01-15T10:30:00+05:30",
      );
      expect(ISODateSchema.parse("2024-01-15T10:30:00-08:00")).toBe(
         "2024-01-15T10:30:00-08:00",
      );
   });

   it("should reject invalid ISO 8601 datetime strings", () => {
      expect(() => ISODateSchema.parse("2024-01-15")).toThrow();
      expect(() => ISODateSchema.parse("2024-01-15T10:30:00")).toThrow();
      expect(() => ISODateSchema.parse("2024-01-15 10:30:00Z")).toThrow();
      expect(() => ISODateSchema.parse("15-01-2024T10:30:00Z")).toThrow();
      expect(() => ISODateSchema.parse("not a date")).toThrow();
   });
});

describe("ISODateOnlySchema", () => {
   it("should accept valid ISO 8601 date-only strings", () => {
      expect(ISODateOnlySchema.parse("2024-01-15")).toBe("2024-01-15");
      expect(ISODateOnlySchema.parse("2024-12-31")).toBe("2024-12-31");
      expect(ISODateOnlySchema.parse("2000-01-01")).toBe("2000-01-01");
   });

   it("should reject invalid date-only strings", () => {
      expect(() => ISODateOnlySchema.parse("2024-01-15T10:30:00Z")).toThrow();
      expect(() => ISODateOnlySchema.parse("15-01-2024")).toThrow();
      expect(() => ISODateOnlySchema.parse("2024-1-15")).toThrow();
      expect(() => ISODateOnlySchema.parse("2024/01/15")).toThrow();
      expect(() => ISODateOnlySchema.parse("not a date")).toThrow();
   });
});

describe("ISOTimeOnlySchema", () => {
   it("should accept valid ISO 8601 time-only strings", () => {
      expect(ISOTimeOnlySchema.parse("10:30:00")).toBe("10:30:00");
      expect(ISOTimeOnlySchema.parse("10:30:00.123")).toBe("10:30:00.123");
      expect(ISOTimeOnlySchema.parse("23:59:59.999")).toBe("23:59:59.999");
      expect(ISOTimeOnlySchema.parse("00:00:00")).toBe("00:00:00");
   });

   it("should reject invalid time-only strings", () => {
      expect(() => ISOTimeOnlySchema.parse("10:30")).toThrow();
      expect(() => ISOTimeOnlySchema.parse("10:30:00Z")).toThrow();
      expect(() => ISOTimeOnlySchema.parse("10:30:00+05:30")).toThrow();
      // Note: regex doesn't validate hour ranges, only format
      expect(() => ISOTimeOnlySchema.parse("not a time")).toThrow();
   });
});

describe("DateTimePluginSchema", () => {
   it("should accept valid plugin objects", () => {
      const plugin = {
         name: "testPlugin",
         install: () => {},
      };
      const result = DateTimePluginSchema.parse(plugin);
      expect(result.name).toBe("testPlugin");
      expect(typeof result.install).toBe("function");
   });

   it("should accept plugins with install function that takes parameters", () => {
      const plugin = {
         name: "configPlugin",
         install: (DateTimeClass: unknown, options?: unknown) => {
            // Plugin installation logic
         },
      };
      const result = DateTimePluginSchema.parse(plugin);
      expect(result.name).toBe("configPlugin");
      expect(typeof result.install).toBe("function");
   });

   it("should reject plugins with empty names", () => {
      expect(() =>
         DateTimePluginSchema.parse({
            name: "",
            install: () => {},
         }),
      ).toThrow();
   });

   it("should reject plugins without install function", () => {
      expect(() =>
         DateTimePluginSchema.parse({
            name: "testPlugin",
         }),
      ).toThrow();
   });

   it("should reject plugins with invalid install property", () => {
      expect(() =>
         DateTimePluginSchema.parse({
            name: "testPlugin",
            install: "not a function",
         }),
      ).toThrow();
   });

   it("should reject plugins without name", () => {
      expect(() =>
         DateTimePluginSchema.parse({
            install: () => {},
         }),
      ).toThrow();
   });
});
