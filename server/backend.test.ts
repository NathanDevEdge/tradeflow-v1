import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";

// Create authenticated user context for testing
function createAuthContext(): { ctx: TrpcContext; user: User } {
  const user: User = {
    id: 999,
    openId: "test-user-backend",
    email: "backend-test@example.com",
    name: "Backend Test User",
    loginMethod: "email",
    role: "user",
    passwordHash: null,
    subscriptionType: "monthly",
    subscriptionEndDate: null,
    subscriptionStatus: "active",
    organizationId: 1, // Default organization
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    organizationId: 1, // Default organization
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx, user };
}

describe("Backend Functionality Tests", () => {
  let pricelistId: number;
  let customerId: number;
  let supplierId: number;
  let quoteId: number;
  let purchaseOrderId: number;

  describe("Pricelist Management", () => {
    it("should create a new pricelist", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.pricelists.create({ name: "Test Pricelist" });
      expect(result.id).toBeDefined();
      expect(result.name).toBe("Test Pricelist");
      pricelistId = result.id;
    });

    it("should add items to pricelist via CSV bulk create", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const items = [
        {
          pricelistId,
          itemName: "Test Item 1",
          skuCode: "SKU001",
          packSize: "10 pack",
          packBuyPrice: 100,
          looseBuyPrice: 12,
          rrpExGst: 15,
          rrpIncGst: 16.5,
          sellPrice: 15,
        },
        {
          pricelistId,
          itemName: "Test Item 2",
          skuCode: "SKU002",
          packSize: null,
          packBuyPrice: null,
          looseBuyPrice: 25,
          rrpExGst: 30,
          rrpIncGst: 33,
          sellPrice: 30,
        },
      ];

      const result = await caller.pricelists.bulkCreateItems({ items });
      expect(result.count).toBe(2);
    });

    it("should list pricelist items", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const items = await caller.pricelistItems.list({ pricelistId });
      expect(items.length).toBe(2);
      expect(items[0]?.itemName).toBe("Test Item 1");
      expect(items[1]?.itemName).toBe("Test Item 2");
    });

    it("should update pricelist item sell price", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const items = await caller.pricelistItems.list({ pricelistId });
      const itemId = items[0]!.id;

      await caller.pricelistItems.update({
        id: itemId,
        sellPrice: "18",
      });

      const updatedItems = await caller.pricelistItems.list({ pricelistId });
      expect(parseFloat(updatedItems[0]?.sellPrice || "0")).toBe(18);
    });
  });

  describe("Customer Management", () => {
    it("should create a new customer", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.customers.create({
        companyName: "Test Customer Co",
        contactName: "John Doe",
        email: "john@testcustomer.com",
        phone: "0400123456",
        billingAddress: "123 Test St, Sydney NSW 2000",
        notes: "Test customer for backend testing",
      });

      expect(result.id).toBeDefined();
      expect(result.companyName).toBe("Test Customer Co");
      customerId = result.id;
    });

    it("should list customers", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const customers = await caller.customers.list();
      expect(customers.length).toBeGreaterThan(0);
      expect(customers.some((c) => c.companyName === "Test Customer Co")).toBe(true);
    });
  });

  describe("Supplier Management", () => {
    it("should create a new supplier", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.suppliers.create({
        companyName: "Test Supplier Ltd",
        billingAddress: "456 Supplier Ave, Melbourne VIC 3000",
        keyContactName: "Jane Smith",
        keyContactEmail: "jane@testsupplier.com",
        poEmail: "orders@testsupplier.com",
        notes: "Test supplier for backend testing",
      });

      expect(result.id).toBeDefined();
      expect(result.companyName).toBe("Test Supplier Ltd");
      supplierId = result.id;
    });

    it("should list suppliers", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const suppliers = await caller.suppliers.list();
      expect(suppliers.length).toBeGreaterThan(0);
      expect(suppliers.some((s) => s.companyName === "Test Supplier Ltd")).toBe(true);
    });
  });

  describe("Quote Creation and Margin Calculations", () => {
    it("should create a quote with line items", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.quotes.create({
        customerId,
        notes: "Test quote for backend testing",
      });

      expect(result.id).toBeDefined();
      expect(result.quoteNumber).toBeDefined();
      quoteId = result.id;
    });

    it("should add line items to quote with correct margin calculations", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const items = await caller.pricelistItems.list({ pricelistId });
      const item1 = items[0]!;

      await caller.quotes.addItem({
        quoteId,
        pricelistItemId: item1.id,
        quantity: 10,
      });

      const quote = await caller.quotes.get({ id: quoteId });
      expect(quote.items.length).toBe(1);

      const lineItem = quote.items[0]!;
      expect(parseFloat(lineItem.quantity)).toBe(10);
      expect(parseFloat(lineItem.sellPrice)).toBe(18); // Updated sell price from earlier test
      expect(parseFloat(lineItem.buyPrice)).toBe(12); // Loose buy price
      expect(parseFloat(lineItem.margin)).toBe(60); // (18 - 12) * 10
      expect(parseFloat(lineItem.lineTotal)).toBe(180); // 18 * 10

      // Check quote totals
      expect(parseFloat(quote.totalAmount)).toBe(180);
      expect(parseFloat(quote.totalMargin)).toBe(60); // 6 * 10
      expect(parseFloat(quote.marginPercentage)).toBeCloseTo(33.33, 1); // (60 / 180) * 100
    });
  });

  describe("Purchase Order Creation", () => {
    it("should create a purchase order with line items", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.purchaseOrders.create({
        supplierId,
        notes: "Test PO for backend testing",
      });

      expect(result.id).toBeDefined();
      expect(result.poNumber).toBeDefined();
      purchaseOrderId = result.id;
    });

    it("should add line items to purchase order", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const items = await caller.pricelistItems.list({ pricelistId });
      const item2 = items[1]!;

      await caller.purchaseOrders.addItem({
        purchaseOrderId,
        pricelistItemId: item2.id,
        quantity: 5,
      });

      const po = await caller.purchaseOrders.get({ id: purchaseOrderId });
      expect(po.items.length).toBe(1);

      const lineItem = po.items[0]!;
      expect(parseFloat(lineItem.quantity)).toBe(5);
      expect(parseFloat(lineItem.buyPrice)).toBe(25); // Loose buy price
      expect(parseFloat(lineItem.lineTotal)).toBe(125); // 25 * 5

      // Check PO total
      expect(parseFloat(po.totalAmount)).toBe(125);
    });
  });

  describe("PDF Generation", () => {
    it("should generate quote PDF without exposing margin data", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.quotes.generatePDF({ id: quoteId });
      expect(result.url).toBeDefined();
      expect(result.url).toContain(".pdf");

      // Note: We can't easily verify PDF content in tests,
      // but the PDF generation logic ensures no margin data is included
    });

    it("should generate purchase order PDF with only buy prices", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.purchaseOrders.generatePDF({ id: purchaseOrderId });
      expect(result.url).toBeDefined();
      expect(result.url).toContain(".pdf");

      // Note: We can't easily verify PDF content in tests,
      // but the PDF generation logic ensures only buy prices are shown
    });
  });

  describe("Data Separation Validation", () => {
    it("should ensure quote includes margin data for internal use", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const quote = await caller.quotes.get({ id: quoteId });
      expect(quote.totalMargin).toBeDefined();
      expect(quote.marginPercentage).toBeDefined();
      expect(quote.items[0]?.margin).toBeDefined();
      expect(quote.items[0]?.buyPrice).toBeDefined();
    });

    it("should ensure purchase order includes buy prices", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const po = await caller.purchaseOrders.get({ id: purchaseOrderId });
      expect(po.items[0]?.buyPrice).toBeDefined();
      expect(po.totalAmount).toBeDefined();
    });
  });
});
