import { describe, it, expect } from "vitest";
import { calculateBuyPrice, calculatePOLineTotal } from "./buyPriceLogic";

describe("Smart Buy Price Logic", () => {
  it("should use loose buy price when quantity is less than pack size", () => {
    const item = {
      looseBuyPrice: "76.00",
      packBuyPrice: "70.00",
      packSize: "60",
    };

    const buyPrice = calculateBuyPrice(50, item);
    expect(buyPrice).toBe(76);
  });

  it("should use pack buy price when quantity equals pack size", () => {
    const item = {
      looseBuyPrice: "76.00",
      packBuyPrice: "70.00",
      packSize: "60",
    };

    const buyPrice = calculateBuyPrice(60, item);
    expect(buyPrice).toBe(70);
  });

  it("should use pack buy price when quantity exceeds pack size", () => {
    const item = {
      looseBuyPrice: "76.00",
      packBuyPrice: "70.00",
      packSize: "60",
    };

    const buyPrice = calculateBuyPrice(64, item);
    expect(buyPrice).toBe(70);
  });

  it("should use loose buy price when pack size is not defined", () => {
    const item = {
      looseBuyPrice: "76.00",
      packBuyPrice: "70.00",
      packSize: null,
    };

    const buyPrice = calculateBuyPrice(100, item);
    expect(buyPrice).toBe(76);
  });

  it("should use loose buy price when pack buy price is not defined", () => {
    const item = {
      looseBuyPrice: "76.00",
      packBuyPrice: null,
      packSize: "60",
    };

    const buyPrice = calculateBuyPrice(100, item);
    expect(buyPrice).toBe(76);
  });

  it("should calculate line total correctly with loose buy price", () => {
    const item = {
      looseBuyPrice: "76.00",
      packBuyPrice: "70.00",
      packSize: "60",
    };

    const lineTotal = calculatePOLineTotal(50, item);
    expect(lineTotal).toBe(3800); // 50 * 76
  });

  it("should calculate line total correctly with pack buy price", () => {
    const item = {
      looseBuyPrice: "76.00",
      packBuyPrice: "70.00",
      packSize: "60",
    };

    const lineTotal = calculatePOLineTotal(64, item);
    expect(lineTotal).toBe(4480); // 64 * 70
  });

  it("should handle decimal quantities", () => {
    const item = {
      looseBuyPrice: "76.50",
      packBuyPrice: "70.25",
      packSize: "60",
    };

    const buyPrice = calculateBuyPrice(65.5, item);
    expect(buyPrice).toBe(70.25);

    const lineTotal = calculatePOLineTotal(65.5, item);
    expect(lineTotal).toBeCloseTo(4601.375, 2); // 65.5 * 70.25
  });
});
