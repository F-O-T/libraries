import { describe, expect, mock, test } from "bun:test";
import { getFipeMarcas, getFipePreco, getFipeTabelas } from "../src/fipe";

describe("getFipeMarcas", () => {
   describe("successful API calls", () => {
      test("should return array of car brands", async () => {
         global.fetch = mock(async () =>
            Response.json([
               { nome: "Acura", valor: "1" },
               { nome: "Audi", valor: "2" },
               { nome: "BMW", valor: "3" },
               { nome: "Chevrolet", valor: "4" },
               { nome: "Fiat", valor: "5" },
               { nome: "Ford", valor: "6" },
               { nome: "Honda", valor: "7" },
               { nome: "Hyundai", valor: "8" },
               { nome: "Nissan", valor: "9" },
               { nome: "Toyota", valor: "10" },
               { nome: "Volkswagen", valor: "11" },
               { nome: "Volvo", valor: "12" },
            ]),
         );

         const brands = await getFipeMarcas("carros");

         expect(Array.isArray(brands)).toBe(true);
         expect(brands.length).toBeGreaterThan(0);
      });

      test("should return brands with required fields", async () => {
         global.fetch = mock(async () =>
            Response.json([{ nome: "Acura", valor: "1" }]),
         );

         const brands = await getFipeMarcas("carros");
         const brand = brands[0];

         expect(brand).toHaveProperty("nome");
         expect(brand).toHaveProperty("valor");

         expect(typeof brand.nome).toBe("string");
         expect(typeof brand.valor).toBe("string");
      });

      test("should return brands with non-empty names", async () => {
         global.fetch = mock(async () =>
            Response.json([
               { nome: "Acura", valor: "1" },
               { nome: "Audi", valor: "2" },
            ]),
         );

         const brands = await getFipeMarcas("carros");

         brands.forEach((brand) => {
            expect(brand.nome.length).toBeGreaterThan(0);
         });
      });

      test("should return brands with valid values", async () => {
         global.fetch = mock(async () =>
            Response.json([
               { nome: "Acura", valor: "1" },
               { nome: "Audi", valor: "2" },
            ]),
         );

         const brands = await getFipeMarcas("carros");

         brands.forEach((brand) => {
            expect(brand.valor.length).toBeGreaterThan(0);
         });
      });

      test("should return multiple car brands", async () => {
         global.fetch = mock(async () =>
            Response.json([
               { nome: "Acura", valor: "1" },
               { nome: "Audi", valor: "2" },
               { nome: "BMW", valor: "3" },
               { nome: "Chevrolet", valor: "4" },
               { nome: "Fiat", valor: "5" },
               { nome: "Ford", valor: "6" },
               { nome: "Honda", valor: "7" },
               { nome: "Hyundai", valor: "8" },
               { nome: "Nissan", valor: "9" },
               { nome: "Toyota", valor: "10" },
               { nome: "Volkswagen", valor: "11" },
               { nome: "Volvo", valor: "12" },
            ]),
         );

         const brands = await getFipeMarcas("carros");

         expect(brands.length).toBeGreaterThan(10);
      });

      test("should return array of motorcycle brands", async () => {
         global.fetch = mock(async () =>
            Response.json([
               { nome: "Honda", valor: "1" },
               { nome: "Yamaha", valor: "2" },
            ]),
         );

         const brands = await getFipeMarcas("motos");

         expect(Array.isArray(brands)).toBe(true);
         expect(brands.length).toBeGreaterThan(0);
      });

      test("should return array of truck brands", async () => {
         global.fetch = mock(async () =>
            Response.json([
               { nome: "Scania", valor: "1" },
               { nome: "Volvo", valor: "2" },
            ]),
         );

         const brands = await getFipeMarcas("caminhoes");

         expect(Array.isArray(brands)).toBe(true);
         expect(brands.length).toBeGreaterThan(0);
      });

      test("should return different brands for different types", async () => {
         let callCount = 0;
         global.fetch = mock(async () => {
            callCount++;
            if (callCount === 1) {
               return Response.json([
                  { nome: "Acura", valor: "1" },
                  { nome: "Audi", valor: "2" },
               ]);
            } else {
               return Response.json([
                  { nome: "Honda", valor: "1" },
                  { nome: "Yamaha", valor: "2" },
                  { nome: "Suzuki", valor: "3" },
               ]);
            }
         });

         const carBrands = await getFipeMarcas("carros");
         const motoBrands = await getFipeMarcas("motos");

         expect(carBrands.length).not.toBe(motoBrands.length);
      });
   });
});

describe("getFipePreco", () => {
   describe("successful API calls", () => {
      test("should return vehicle price information", async () => {
         global.fetch = mock(async () =>
            Response.json({
               valor: "R$ 45.000,00",
               marca: "VW - VolksWagen",
               modelo: "Gol 1.0",
               anoModelo: 2020,
               combustivel: "Gasolina",
               codigoFipe: "004278-1",
               mesReferencia: "janeiro de 2024",
               tipoVeiculo: 1,
               siglaCombustivel: "G",
            }),
         );

         const price = await getFipePreco("004278-1");

         expect(price).toHaveProperty("valor");
         expect(price).toHaveProperty("marca");
         expect(price).toHaveProperty("modelo");
         expect(price).toHaveProperty("anoModelo");
         expect(price).toHaveProperty("combustivel");
         expect(price).toHaveProperty("codigoFipe");
         expect(price).toHaveProperty("mesReferencia");
         expect(price).toHaveProperty("tipoVeiculo");
         expect(price).toHaveProperty("siglaCombustivel");

         expect(typeof price.valor).toBe("string");
         expect(typeof price.marca).toBe("string");
         expect(typeof price.modelo).toBe("string");
         expect(typeof price.anoModelo).toBe("number");
         expect(typeof price.combustivel).toBe("string");
         expect(typeof price.codigoFipe).toBe("string");
         expect(typeof price.mesReferencia).toBe("string");
         expect(typeof price.tipoVeiculo).toBe("number");
         expect(typeof price.siglaCombustivel).toBe("string");
      });

      test("should return valid FIPE code", async () => {
         global.fetch = mock(async () =>
            Response.json({
               valor: "R$ 45.000,00",
               marca: "VW - VolksWagen",
               modelo: "Gol 1.0",
               anoModelo: 2020,
               combustivel: "Gasolina",
               codigoFipe: "004278-1",
               mesReferencia: "janeiro de 2024",
               tipoVeiculo: 1,
               siglaCombustivel: "G",
            }),
         );

         const price = await getFipePreco("004278-1");

         expect(price.codigoFipe).toBe("004278-1");
      });

      test("should return non-empty brand name", async () => {
         global.fetch = mock(async () =>
            Response.json({
               valor: "R$ 45.000,00",
               marca: "VW - VolksWagen",
               modelo: "Gol 1.0",
               anoModelo: 2020,
               combustivel: "Gasolina",
               codigoFipe: "004278-1",
               mesReferencia: "janeiro de 2024",
               tipoVeiculo: 1,
               siglaCombustivel: "G",
            }),
         );

         const price = await getFipePreco("004278-1");

         expect(price.marca.length).toBeGreaterThan(0);
      });

      test("should return non-empty model name", async () => {
         global.fetch = mock(async () =>
            Response.json({
               valor: "R$ 45.000,00",
               marca: "VW - VolksWagen",
               modelo: "Gol 1.0",
               anoModelo: 2020,
               combustivel: "Gasolina",
               codigoFipe: "004278-1",
               mesReferencia: "janeiro de 2024",
               tipoVeiculo: 1,
               siglaCombustivel: "G",
            }),
         );

         const price = await getFipePreco("004278-1");

         expect(price.modelo.length).toBeGreaterThan(0);
      });

      test("should return valid year model", async () => {
         global.fetch = mock(async () =>
            Response.json({
               valor: "R$ 45.000,00",
               marca: "VW - VolksWagen",
               modelo: "Gol 1.0",
               anoModelo: 2020,
               combustivel: "Gasolina",
               codigoFipe: "004278-1",
               mesReferencia: "janeiro de 2024",
               tipoVeiculo: 1,
               siglaCombustivel: "G",
            }),
         );

         const price = await getFipePreco("004278-1");

         expect(price.anoModelo).toBeGreaterThan(1900);
         expect(price.anoModelo).toBeLessThanOrEqual(
            new Date().getFullYear() + 1,
         );
      });

      test("should return valid price format", async () => {
         global.fetch = mock(async () =>
            Response.json({
               valor: "R$ 45.000,00",
               marca: "VW - VolksWagen",
               modelo: "Gol 1.0",
               anoModelo: 2020,
               combustivel: "Gasolina",
               codigoFipe: "004278-1",
               mesReferencia: "janeiro de 2024",
               tipoVeiculo: 1,
               siglaCombustivel: "G",
            }),
         );

         const price = await getFipePreco("004278-1");

         expect(price.valor).toMatch(/^R\$\s[\d.,]+$/);
      });

      test("should return valid vehicle type", async () => {
         global.fetch = mock(async () =>
            Response.json({
               valor: "R$ 45.000,00",
               marca: "VW - VolksWagen",
               modelo: "Gol 1.0",
               anoModelo: 2020,
               combustivel: "Gasolina",
               codigoFipe: "004278-1",
               mesReferencia: "janeiro de 2024",
               tipoVeiculo: 1,
               siglaCombustivel: "G",
            }),
         );

         const price = await getFipePreco("004278-1");

         expect([1, 2, 3]).toContain(price.tipoVeiculo);
      });

      test("should return non-empty fuel type", async () => {
         global.fetch = mock(async () =>
            Response.json({
               valor: "R$ 45.000,00",
               marca: "VW - VolksWagen",
               modelo: "Gol 1.0",
               anoModelo: 2020,
               combustivel: "Gasolina",
               codigoFipe: "004278-1",
               mesReferencia: "janeiro de 2024",
               tipoVeiculo: 1,
               siglaCombustivel: "G",
            }),
         );

         const price = await getFipePreco("004278-1");

         expect(price.combustivel.length).toBeGreaterThan(0);
         expect(price.siglaCombustivel.length).toBeGreaterThan(0);
      });
   });
});

describe("getFipeTabelas", () => {
   describe("successful API calls", () => {
      test("should return array of reference tables", async () => {
         global.fetch = mock(async () =>
            Response.json([
               { codigo: 290, mes: "janeiro de 2024" },
               { codigo: 289, mes: "dezembro de 2023" },
               { codigo: 288, mes: "novembro de 2023" },
               { codigo: 287, mes: "outubro de 2023" },
               { codigo: 286, mes: "setembro de 2023" },
               { codigo: 285, mes: "agosto de 2023" },
            ]),
         );

         const tables = await getFipeTabelas();

         expect(Array.isArray(tables)).toBe(true);
         expect(tables.length).toBeGreaterThan(0);
      });

      test("should return tables with required fields", async () => {
         global.fetch = mock(async () =>
            Response.json([{ codigo: 290, mes: "janeiro de 2024" }]),
         );

         const tables = await getFipeTabelas();
         const table = tables[0];

         expect(table).toHaveProperty("codigo");
         expect(table).toHaveProperty("mes");

         expect(typeof table.codigo).toBe("number");
         expect(typeof table.mes).toBe("string");
      });

      test("should return tables with valid codes", async () => {
         global.fetch = mock(async () =>
            Response.json([
               { codigo: 290, mes: "janeiro de 2024" },
               { codigo: 289, mes: "dezembro de 2023" },
            ]),
         );

         const tables = await getFipeTabelas();

         tables.forEach((table) => {
            expect(table.codigo).toBeGreaterThan(0);
         });
      });

      test("should return tables with month descriptions", async () => {
         global.fetch = mock(async () =>
            Response.json([
               { codigo: 290, mes: "janeiro de 2024" },
               { codigo: 289, mes: "dezembro de 2023" },
            ]),
         );

         const tables = await getFipeTabelas();

         tables.forEach((table) => {
            expect(table.mes.length).toBeGreaterThan(0);
         });
      });

      test("should return multiple reference tables", async () => {
         global.fetch = mock(async () =>
            Response.json([
               { codigo: 290, mes: "janeiro de 2024" },
               { codigo: 289, mes: "dezembro de 2023" },
               { codigo: 288, mes: "novembro de 2023" },
               { codigo: 287, mes: "outubro de 2023" },
               { codigo: 286, mes: "setembro de 2023" },
               { codigo: 285, mes: "agosto de 2023" },
            ]),
         );

         const tables = await getFipeTabelas();

         expect(tables.length).toBeGreaterThan(5);
      });

      test("should return tables ordered by code", async () => {
         global.fetch = mock(async () =>
            Response.json([
               { codigo: 290, mes: "janeiro de 2024" },
               { codigo: 289, mes: "dezembro de 2023" },
               { codigo: 288, mes: "novembro de 2023" },
               { codigo: 287, mes: "outubro de 2023" },
            ]),
         );

         const tables = await getFipeTabelas();

         for (let i = 1; i < tables.length; i++) {
            expect(tables[i - 1].codigo).toBeGreaterThanOrEqual(
               tables[i].codigo,
            );
         }
      });

      test("should return recent reference tables", async () => {
         const currentYear = new Date().getFullYear();
         global.fetch = mock(async () =>
            Response.json([
               { codigo: 290, mes: `janeiro de ${currentYear}` },
               { codigo: 289, mes: `dezembro de ${currentYear - 1}` },
            ]),
         );

         const tables = await getFipeTabelas();

         const hasCurrentYear = tables.some((table) =>
            table.mes.includes(currentYear.toString()),
         );

         expect(hasCurrentYear).toBe(true);
      });
   });
});
