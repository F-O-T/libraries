import { describe, expect, mock, test } from "bun:test";
import { getCidades, getPrevisao, getPrevisaoOndas } from "../src/cptec";

describe("getCidades", () => {
   describe("successful API calls", () => {
      test("should return array of cities", async () => {
         global.fetch = mock(async () =>
            Response.json([
               { id: 244, nome: "São Paulo", estado: "SP" },
               { id: 201, nome: "Rio de Janeiro", estado: "RJ" },
               { id: 241, nome: "Santos", estado: "SP" },
            ]),
         );

         const cities = await getCidades();

         expect(Array.isArray(cities)).toBe(true);
         expect(cities.length).toBeGreaterThan(0);
      });

      test("should return cities with required fields", async () => {
         global.fetch = mock(async () =>
            Response.json([{ id: 244, nome: "São Paulo", estado: "SP" }]),
         );

         const cities = await getCidades();
         const city = cities[0];

         expect(city).toHaveProperty("id");
         expect(city).toHaveProperty("nome");
         expect(city).toHaveProperty("estado");

         expect(typeof city.id).toBe("number");
         expect(typeof city.nome).toBe("string");
         expect(typeof city.estado).toBe("string");
      });

      test("should return cities with valid IDs", async () => {
         global.fetch = mock(async () =>
            Response.json([
               { id: 244, nome: "São Paulo", estado: "SP" },
               { id: 201, nome: "Rio de Janeiro", estado: "RJ" },
            ]),
         );

         const cities = await getCidades();

         cities.forEach((city) => {
            expect(city.id).toBeGreaterThan(0);
         });
      });

      test("should return cities with non-empty names", async () => {
         global.fetch = mock(async () =>
            Response.json([
               { id: 244, nome: "São Paulo", estado: "SP" },
               { id: 201, nome: "Rio de Janeiro", estado: "RJ" },
            ]),
         );

         const cities = await getCidades();

         cities.forEach((city) => {
            expect(city.nome.length).toBeGreaterThan(0);
         });
      });

      test("should return cities with valid state codes", async () => {
         global.fetch = mock(async () =>
            Response.json([
               { id: 244, nome: "São Paulo", estado: "SP" },
               { id: 201, nome: "Rio de Janeiro", estado: "RJ" },
               { id: 241, nome: "Santos", estado: "SP" },
            ]),
         );

         const cities = await getCidades();

         cities.forEach((city) => {
            expect(city.estado).toMatch(/^[A-Z]{2}$/);
         });
      });

      test("should include multiple cities", async () => {
         const mockCities = Array.from({ length: 60 }, (_, i) => ({
            id: i + 1,
            nome: `Cidade ${i + 1}`,
            estado: "SP",
         }));

         global.fetch = mock(async () => Response.json(mockCities));

         const cities = await getCidades();

         expect(cities.length).toBeGreaterThan(50);
      });
   });
});

describe("getPrevisao", () => {
   describe("successful API calls", () => {
      test("should return weather forecast for 1 day", async () => {
         global.fetch = mock(async () =>
            Response.json({
               cidade: "São Paulo",
               estado: "SP",
               atualizado_em: "2024-01-30 10:00:00",
               clima: [
                  {
                     data: "2024-01-30",
                     condicao: "ps",
                     min: 18,
                     max: 28,
                     indice_uv: 8,
                  },
               ],
            }),
         );

         const forecast = await getPrevisao(244, 1);

         expect(forecast).toHaveProperty("cidade");
         expect(forecast).toHaveProperty("estado");
         expect(forecast).toHaveProperty("atualizado_em");
         expect(forecast).toHaveProperty("clima");

         expect(typeof forecast.cidade).toBe("string");
         expect(typeof forecast.estado).toBe("string");
         expect(typeof forecast.atualizado_em).toBe("string");
         expect(Array.isArray(forecast.clima)).toBe(true);
      });

      test("should return default 1 day forecast", async () => {
         global.fetch = mock(async () =>
            Response.json({
               cidade: "São Paulo",
               estado: "SP",
               atualizado_em: "2024-01-30 10:00:00",
               clima: [
                  {
                     data: "2024-01-30",
                     condicao: "ps",
                     min: 18,
                     max: 28,
                     indice_uv: 8,
                  },
               ],
            }),
         );

         const forecast = await getPrevisao(244);

         expect(forecast.clima.length).toBeGreaterThanOrEqual(1);
      });

      test("should return forecast with clima array", async () => {
         global.fetch = mock(async () =>
            Response.json({
               cidade: "São Paulo",
               estado: "SP",
               atualizado_em: "2024-01-30 10:00:00",
               clima: [
                  {
                     data: "2024-01-30",
                     condicao: "ps",
                     min: 18,
                     max: 28,
                     indice_uv: 8,
                  },
               ],
            }),
         );

         const forecast = await getPrevisao(244, 1);
         const clima = forecast.clima[0];

         expect(clima).toHaveProperty("data");
         expect(clima).toHaveProperty("condicao");
         expect(clima).toHaveProperty("min");
         expect(clima).toHaveProperty("max");
         expect(clima).toHaveProperty("indice_uv");

         expect(typeof clima.data).toBe("string");
         expect(typeof clima.condicao).toBe("string");
         expect(typeof clima.min).toBe("number");
         expect(typeof clima.max).toBe("number");
         expect(typeof clima.indice_uv).toBe("number");
      });

      test("should return forecast for multiple days", async () => {
         global.fetch = mock(async () =>
            Response.json({
               cidade: "São Paulo",
               estado: "SP",
               atualizado_em: "2024-01-30 10:00:00",
               clima: [
                  {
                     data: "2024-01-30",
                     condicao: "ps",
                     min: 18,
                     max: 28,
                     indice_uv: 8,
                  },
                  {
                     data: "2024-01-31",
                     condicao: "ps",
                     min: 19,
                     max: 29,
                     indice_uv: 7,
                  },
                  {
                     data: "2024-02-01",
                     condicao: "ps",
                     min: 20,
                     max: 30,
                     indice_uv: 8,
                  },
               ],
            }),
         );

         const forecast = await getPrevisao(244, 6);

         expect(forecast.clima.length).toBeGreaterThanOrEqual(1);
         expect(forecast.clima.length).toBeLessThanOrEqual(6);
      });

      test("should return valid temperatures", async () => {
         global.fetch = mock(async () =>
            Response.json({
               cidade: "São Paulo",
               estado: "SP",
               atualizado_em: "2024-01-30 10:00:00",
               clima: [
                  {
                     data: "2024-01-30",
                     condicao: "ps",
                     min: 18,
                     max: 28,
                     indice_uv: 8,
                  },
               ],
            }),
         );

         const forecast = await getPrevisao(244, 1);

         forecast.clima.forEach((clima) => {
            expect(clima.min).toBeLessThanOrEqual(clima.max);
         });
      });

      test("should return valid date format", async () => {
         global.fetch = mock(async () =>
            Response.json({
               cidade: "São Paulo",
               estado: "SP",
               atualizado_em: "2024-01-30 10:00:00",
               clima: [
                  {
                     data: "2024-01-30",
                     condicao: "ps",
                     min: 18,
                     max: 28,
                     indice_uv: 8,
                  },
               ],
            }),
         );

         const forecast = await getPrevisao(244, 1);

         forecast.clima.forEach((clima) => {
            expect(clima.data).toMatch(/^\d{4}-\d{2}-\d{2}$/);
         });
      });
   });
});

describe("getPrevisaoOndas", () => {
   describe("successful API calls", () => {
      test("should return ocean wave forecast", async () => {
         global.fetch = mock(async () =>
            Response.json({
               cidade: "Santos",
               estado: "SP",
               atualizado_em: "2024-01-30 10:00:00",
               ondas: [
                  {
                     data: "2024-01-30",
                     dados_ondas: [
                        {
                           vento: 15,
                           direcao_vento: "SE",
                           altura_onda: 1.2,
                           agitation: "Fraca",
                        },
                     ],
                  },
               ],
            }),
         );

         const forecast = await getPrevisaoOndas(241);

         expect(forecast).toHaveProperty("cidade");
         expect(forecast).toHaveProperty("estado");
         expect(forecast).toHaveProperty("atualizado_em");
         expect(forecast).toHaveProperty("ondas");

         expect(typeof forecast.cidade).toBe("string");
         expect(typeof forecast.estado).toBe("string");
         expect(typeof forecast.atualizado_em).toBe("string");
         expect(Array.isArray(forecast.ondas)).toBe(true);
      });

      test("should return forecast with ondas array", async () => {
         global.fetch = mock(async () =>
            Response.json({
               cidade: "Santos",
               estado: "SP",
               atualizado_em: "2024-01-30 10:00:00",
               ondas: [
                  {
                     data: "2024-01-30",
                     dados_ondas: [
                        {
                           vento: 15,
                           direcao_vento: "SE",
                           altura_onda: 1.2,
                           agitation: "Fraca",
                        },
                     ],
                  },
               ],
            }),
         );

         const forecast = await getPrevisaoOndas(241);

         if (forecast.ondas.length > 0) {
            const onda = forecast.ondas[0];

            expect(onda).toHaveProperty("data");
            expect(onda).toHaveProperty("dados_ondas");

            expect(typeof onda.data).toBe("string");
            expect(Array.isArray(onda.dados_ondas)).toBe(true);
         }
      });

      test("should return forecast with wave details", async () => {
         global.fetch = mock(async () =>
            Response.json({
               cidade: "Santos",
               estado: "SP",
               atualizado_em: "2024-01-30 10:00:00",
               ondas: [
                  {
                     data: "2024-01-30",
                     dados_ondas: [
                        {
                           vento: 15,
                           direcao_vento: "SE",
                           altura_onda: 1.2,
                           agitation: "Fraca",
                        },
                     ],
                  },
               ],
            }),
         );

         const forecast = await getPrevisaoOndas(241);

         if (
            forecast.ondas.length > 0 &&
            forecast.ondas[0].dados_ondas.length > 0
         ) {
            const dado = forecast.ondas[0].dados_ondas[0];

            expect(dado).toHaveProperty("vento");
            expect(dado).toHaveProperty("direcao_vento");
            expect(dado).toHaveProperty("altura_onda");
            expect(dado).toHaveProperty("agitation");

            expect(typeof dado.vento).toBe("number");
            expect(typeof dado.direcao_vento).toBe("string");
            expect(typeof dado.altura_onda).toBe("number");
            expect(typeof dado.agitation).toBe("string");
         }
      });

      test("should return valid date format", async () => {
         global.fetch = mock(async () =>
            Response.json({
               cidade: "Santos",
               estado: "SP",
               atualizado_em: "2024-01-30 10:00:00",
               ondas: [
                  {
                     data: "2024-01-30",
                     dados_ondas: [
                        {
                           vento: 15,
                           direcao_vento: "SE",
                           altura_onda: 1.2,
                           agitation: "Fraca",
                        },
                     ],
                  },
               ],
            }),
         );

         const forecast = await getPrevisaoOndas(241);

         forecast.ondas.forEach((onda) => {
            expect(onda.data).toMatch(/^\d{4}-\d{2}-\d{2}$/);
         });
      });
   });
});
