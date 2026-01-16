import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "email",
    role: "admin",
    organizationId: 1, // Default organization
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    subscriptionType: null,
    subscriptionEndDate: null,
    subscriptionStatus: "active",
    passwordHash: null,
  };

  const ctx: TrpcContext = {
    user,
    organizationId: 1, // Default organization
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("CSV Upload Validation", () => {
  it("should accept CSV with lowercase column names", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a test pricelist
    const pricelist = await caller.pricelists.create({ name: "Test Pricelist" });

    // CSV data with lowercase column names (matching user's file)
    const csvData = [
      {
        "Item Name": "HOME Barossa Grooved - 138mm x 5.4m",
        "SKU Code": "HG-BAR-138",
        "Pack size": "70pcs",
        "pack buy price": "63.00",
        "loose buy price": "66.15",
        "RRP ex gst": "89.09",
        "RRP inc gst": "98.00",
      },
    ];

    const result = await caller.pricelistItems.uploadCSV({
      pricelistId: pricelist.id,
      csvData,
    });

    expect(result.success).toBe(true);
    expect(result.itemsCreated).toBe(1);
  });

  it("should accept CSV with mixed case column names", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const pricelist = await caller.pricelists.create({ name: "Test Pricelist 2" });

    const csvData = [
      {
        "Item Name": "ADVANCED Oak Grooved - 140mm x 5.4m",
        "SKU Code": "AG140-OA",
        "Pack Size": "70pcs",
        "Pack Buy Price": "89.10",
        "Loose Buy Price": "94.00",
        "RRP Ex GST": "132.73",
        "RRP Inc GST": "146.00",
      },
    ];

    const result = await caller.pricelistItems.uploadCSV({
      pricelistId: pricelist.id,
      csvData,
    });

    expect(result.success).toBe(true);
    expect(result.itemsCreated).toBe(1);
  });

  it("should accept CSV with optional empty fields", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const pricelist = await caller.pricelists.create({ name: "Test Pricelist 3" });

    // Some items have empty pack size and pack buy price (like rows 70-90 in user's file)
    const csvData = [
      {
        "Item Name": "CLADDING Beach Corner Trim - 4.2m x 60mm x 60mm",
        "SKU Code": "DCC4-BCH-4200",
        "Pack size": "",
        "pack buy price": "",
        "loose buy price": "28.00",
        "RRP ex gst": "44.55",
        "RRP inc gst": "49.00",
      },
    ];

    const result = await caller.pricelistItems.uploadCSV({
      pricelistId: pricelist.id,
      csvData,
    });

    expect(result.success).toBe(true);
    expect(result.itemsCreated).toBe(1);
  });

  it("should reject CSV with missing required fields", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const pricelist = await caller.pricelists.create({ name: "Test Pricelist 4" });

    const csvData = [
      {
        "Item Name": "Test Item",
        "SKU Code": "TEST-001",
        "Pack size": "10pcs",
        "pack buy price": "10.00",
        // Missing loose buy price (required)
        "RRP ex gst": "20.00",
        "RRP inc gst": "22.00",
      },
    ];

    await expect(
      caller.pricelistItems.uploadCSV({
        pricelistId: pricelist.id,
        csvData,
      })
    ).rejects.toThrow();
  });
});
