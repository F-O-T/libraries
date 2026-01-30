import { describe, expect, mock, test } from "bun:test";
import { BrasilApiValidationError } from "../src/errors";
import { getFeriados } from "../src/feriados";

describe("getFeriados", () => {
   describe("input validation", () => {
      test("should throw BrasilApiValidationError for year below minimum (1900)", () => {
         expect(() => getFeriados(1899)).toThrow(BrasilApiValidationError);
         expect(() => getFeriados(1899)).toThrow(
            "Year must be between 1900 and 2199",
         );
      });

      test("should throw BrasilApiValidationError for year above maximum (2199)", () => {
         expect(() => getFeriados(2200)).toThrow(BrasilApiValidationError);
         expect(() => getFeriados(2200)).toThrow(
            "Year must be between 1900 and 2199",
         );
      });

      test("should throw BrasilApiValidationError for non-integer year", () => {
         expect(() => getFeriados(2024.5)).toThrow(BrasilApiValidationError);
         expect(() => getFeriados(2024.5)).toThrow("Year must be an integer");
      });

      test("should accept minimum valid year (1900)", () => {
         global.fetch = mock(async () => Response.json([]));
         expect(() => getFeriados(1900)).not.toThrow();
      });

      test("should accept maximum valid year (2199)", () => {
         global.fetch = mock(async () => Response.json([]));
         expect(() => getFeriados(2199)).not.toThrow();
      });

      test("should accept year in valid range", () => {
         global.fetch = mock(async () => Response.json([]));
         expect(() => getFeriados(2024)).not.toThrow();
      });
   });

   describe("successful API calls", () => {
      test("should return array of holidays", async () => {
         global.fetch = mock(async () =>
            Response.json([
               {
                  date: "2024-01-01",
                  name: "Confraternização mundial",
                  type: "national",
               },
               {
                  date: "2024-04-21",
                  name: "Tiradentes",
                  type: "national",
               },
               {
                  date: "2024-05-01",
                  name: "Dia do trabalho",
                  type: "national",
               },
            ]),
         );

         const holidays = await getFeriados(2024);
         expect(Array.isArray(holidays)).toBe(true);
         expect(holidays.length).toBeGreaterThan(0);
      });

      test("should return holidays with correct schema", async () => {
         global.fetch = mock(async () =>
            Response.json([
               {
                  date: "2024-01-01",
                  name: "Confraternização mundial",
                  type: "national",
               },
            ]),
         );

         const holidays = await getFeriados(2024);
         const holiday = holidays[0];

         expect(holiday).toHaveProperty("date");
         expect(holiday).toHaveProperty("name");
         expect(holiday).toHaveProperty("type");

         expect(typeof holiday.date).toBe("string");
         expect(typeof holiday.name).toBe("string");
         expect(typeof holiday.type).toBe("string");
      });

      test("should return holidays in date format YYYY-MM-DD", async () => {
         global.fetch = mock(async () =>
            Response.json([
               {
                  date: "2024-01-01",
                  name: "Confraternização mundial",
                  type: "national",
               },
               {
                  date: "2024-04-21",
                  name: "Tiradentes",
                  type: "national",
               },
            ]),
         );

         const holidays = await getFeriados(2024);
         const datePattern = /^\d{4}-\d{2}-\d{2}$/;

         for (const holiday of holidays) {
            expect(datePattern.test(holiday.date)).toBe(true);
         }
      });

      test("should include expected Brazilian national holidays", async () => {
         global.fetch = mock(async () =>
            Response.json([
               {
                  date: "2024-01-01",
                  name: "Confraternização mundial",
                  type: "national",
               },
               {
                  date: "2024-04-21",
                  name: "Tiradentes",
                  type: "national",
               },
               {
                  date: "2024-05-01",
                  name: "Dia do trabalho",
                  type: "national",
               },
            ]),
         );

         const holidays = await getFeriados(2024);
         const holidayNames = holidays.map((h) => h.name);

         // Check for some well-known Brazilian holidays
         expect(
            holidayNames.some((name) =>
               name.toLowerCase().includes("confraternização"),
            ),
         ).toBe(true); // Confraternização mundial (New Year)
         expect(
            holidayNames.some((name) =>
               name.toLowerCase().includes("tiradentes"),
            ),
         ).toBe(true); // Tiradentes
         expect(
            holidayNames.some((name) =>
               name.toLowerCase().includes("trabalho"),
            ),
         ).toBe(true); // Dia do trabalho
      });
   });
});
