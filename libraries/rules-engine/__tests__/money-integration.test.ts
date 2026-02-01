import { describe, expect, test } from "bun:test";
import { createEngine } from "../src/engine/engine";
import { moneyOperators } from "@f-o-t/money/plugins/operators";
import { z } from "zod";

type TransactionContext = {
  amount: {
    amount: string;
    currency: string;
  };
  accountBalance: {
    amount: string;
    currency: string;
  };
};

const TransactionConsequences = {
  approve: z.object({ approved: z.boolean() }),
  require_review: z.object({ reason: z.string() }),
  reject: z.object({ reason: z.string() }),
} as const;

describe("Money operators integration", () => {
  test("should use money_gt operator in rules", async () => {
    const engine = createEngine<TransactionContext, typeof TransactionConsequences>({
      consequences: TransactionConsequences,
      operators: moneyOperators,
    });

    engine.addRule({
      name: "high-value-transaction",
      conditions: {
        id: "g1",
        operator: "AND",
        conditions: [
          {
            id: "c1",
            type: "custom",
            field: "amount",
            operator: "money_gt",
            value: { amount: "1000.00", currency: "BRL" },
          },
        ],
      },
      consequences: [
        {
          type: "require_review",
          payload: { reason: "High value transaction" },
        },
      ],
    });

    const result = await engine.evaluate({
      amount: { amount: "1500.00", currency: "BRL" },
      accountBalance: { amount: "10000.00", currency: "BRL" },
    });

    expect(result.matchedRules).toHaveLength(1);
    expect(result.matchedRules[0]?.name).toBe("high-value-transaction");
    expect(result.consequences).toHaveLength(1);
    expect(result.consequences[0]?.type).toBe("require_review");
  });

  test("should use money_between operator", async () => {
    const engine = createEngine<TransactionContext, typeof TransactionConsequences>({
      consequences: TransactionConsequences,
      operators: moneyOperators,
    });

    engine.addRule({
      name: "medium-value-transaction",
      conditions: {
        id: "g1",
        operator: "AND",
        conditions: [
          {
            id: "c1",
            type: "custom",
            field: "amount",
            operator: "money_between",
            value: [
              { amount: "100.00", currency: "BRL" },
              { amount: "1000.00", currency: "BRL" },
            ],
          },
        ],
      },
      consequences: [
        {
          type: "approve",
          payload: { approved: true },
        },
      ],
    });

    const result = await engine.evaluate({
      amount: { amount: "500.00", currency: "BRL" },
      accountBalance: { amount: "10000.00", currency: "BRL" },
    });

    expect(result.matchedRules).toHaveLength(1);
    expect(result.consequences[0]?.type).toBe("approve");
  });

  test("should handle multiple money conditions", async () => {
    const engine = createEngine<TransactionContext, typeof TransactionConsequences>({
      consequences: TransactionConsequences,
      operators: moneyOperators,
    });

    engine.addRule({
      name: "insufficient-funds",
      conditions: {
        id: "g1",
        operator: "AND",
        conditions: [
          {
            id: "c1",
            type: "custom",
            field: "amount",
            operator: "money_gt",
            value: { amount: "0.00", currency: "BRL" },
          },
          {
            id: "c2",
            type: "custom",
            field: "accountBalance",
            operator: "money_lt",
            value: { amount: "100.00", currency: "BRL" },
          },
        ],
      },
      consequences: [
        {
          type: "reject",
          payload: { reason: "Insufficient funds" },
        },
      ],
    });

    const result = await engine.evaluate({
      amount: { amount: "50.00", currency: "BRL" },
      accountBalance: { amount: "25.00", currency: "BRL" },
    });

    expect(result.matchedRules).toHaveLength(1);
    expect(result.consequences[0]?.type).toBe("reject");
  });
});
