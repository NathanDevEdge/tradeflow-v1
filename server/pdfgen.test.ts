import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";
import { generateQuotePDF, generatePurchaseOrderPDF } from "./pdfgen";

/**
 * Tests for PDF filename and S3 path security
 * Verifies:
 * 1. Meaningful filenames (PO00001-SupplierName-2026-01-18.pdf)
 * 2. Secure S3 paths with org identifiers (pdfs/{orgId}-{hash}/filename.pdf)
 */

describe("PDF Generation Security", () => {
  let testOrgId: number;
  let testCustomerId: number;
  let testSupplierId: number;
  let testQuoteId: number;
  let testPoId: number;

  beforeAll(async () => {
    // Create test organization
    testOrgId = 30001; // Use OnlyFences org ID from production

    // Check if test customer exists
    const customers = await db.getAllCustomers(testOrgId);
    if (customers.length > 0) {
      testCustomerId = customers[0].id;
    } else {
      // Create test customer
      const customer = await db.createCustomer({
        companyName: "Test Customer Co",
        contactName: "John Doe",
        email: "test@customer.com",
        phone: "0400000000",
        billingAddress: "123 Test St",
        notes: "",
        organizationId: testOrgId,
      });
      testCustomerId = customer.id;
    }

    // Check if test supplier exists
    const suppliers = await db.getAllSuppliers(testOrgId);
    if (suppliers.length > 0) {
      testSupplierId = suppliers[0].id;
    } else {
      // Create test supplier
      const supplier = await db.createSupplier({
        companyName: "Test Supplier Ltd",
        billingAddress: "456 Supplier Ave",
        keyContactName: "Jane Smith",
        keyContactEmail: "jane@supplier.com",
        poEmail: "po@supplier.com",
        notes: "",
        organizationId: testOrgId,
      });
      testSupplierId = supplier.id;
    }

    // Create test quote
    const quote = await db.createQuote({
      customerId: testCustomerId,
      quoteNumber: `Q${Date.now()}`,
      status: "draft",
      totalAmount: "100.00",
      totalMargin: "20.00",
      marginPercentage: "20.00",
      notes: "",
      organizationId: testOrgId,
    });
    testQuoteId = quote.id;

    // Create test PO
    const po = await db.createPurchaseOrder({
      supplierId: testSupplierId,
      poNumber: `PO${Date.now()}`,
      status: "draft",
      totalAmount: "100.00",
      notes: "",
      deliveryMethod: "pickup_from_supplier",
      shippingAddress: null,
      organizationId: testOrgId,
    });
    testPoId = po.id;
  });

  it("should generate quote PDF with meaningful filename and secure S3 path", async () => {
    const url = await generateQuotePDF(testQuoteId, testOrgId);

    // Verify URL exists
    expect(url).toBeDefined();
    expect(typeof url).toBe("string");
    expect(url.length).toBeGreaterThan(0);

    // Verify URL contains secure path pattern: pdfs/{orgId}-{hash}/
    expect(url).toMatch(/pdfs\/\d+-[a-z0-9]+\//);

    // Verify URL contains organization ID
    expect(url).toContain(`pdfs/${testOrgId}-`);

    // Verify filename pattern: Q{number}-{CompanyName}-{date}.pdf
    expect(url).toMatch(/Q\d+-[A-Za-z0-9]+-\d{4}-\d{2}-\d{2}\.pdf$/);

    console.log("✅ Quote PDF URL:", url);
  });

  it("should generate PO PDF with meaningful filename and secure S3 path", async () => {
    const url = await generatePurchaseOrderPDF(testPoId, testOrgId);

    // Verify URL exists
    expect(url).toBeDefined();
    expect(typeof url).toBe("string");
    expect(url.length).toBeGreaterThan(0);

    // Verify URL contains secure path pattern: pdfs/{orgId}-{hash}/
    expect(url).toMatch(/pdfs\/\d+-[a-z0-9]+\//);

    // Verify URL contains organization ID
    expect(url).toContain(`pdfs/${testOrgId}-`);

    // Verify filename pattern: PO{number}-{CompanyName}-{date}.pdf
    expect(url).toMatch(/PO\d+-[A-Za-z0-9]+-\d{4}-\d{2}-\d{2}\.pdf$/);

    console.log("✅ PO PDF URL:", url);
  });

  it("should generate different random hashes for each PDF to prevent enumeration", async () => {
    // Generate two PDFs
    const url1 = await generateQuotePDF(testQuoteId, testOrgId);
    const url2 = await generateQuotePDF(testQuoteId, testOrgId);

    // Extract hash from URLs (pattern: pdfs/{orgId}-{hash}/)
    const hashMatch1 = url1.match(/pdfs\/\d+-([a-z0-9]+)\//);
    const hashMatch2 = url2.match(/pdfs\/\d+-([a-z0-9]+)\//);

    expect(hashMatch1).toBeTruthy();
    expect(hashMatch2).toBeTruthy();

    const hash1 = hashMatch1![1];
    const hash2 = hashMatch2![1];

    // Hashes should be different (random)
    expect(hash1).not.toBe(hash2);

    console.log("✅ Hash 1:", hash1);
    console.log("✅ Hash 2:", hash2);
  });
});
