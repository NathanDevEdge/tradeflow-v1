import PDFDocument from "pdfkit";
import { storagePut } from "./storage";
import * as db from "./db";

/**
 * Generate a customer-facing quote PDF
 * IMPORTANT: Must NOT include buy prices or margin data
 */
export async function generateQuotePDF(quoteId: number): Promise<string> {
  const quote = await db.getQuoteById(quoteId);
  if (!quote) throw new Error("Quote not found");
  
  const customer = await db.getCustomerById(quote.customerId);
  if (!customer) throw new Error("Customer not found");
  
  const items = await db.getQuoteItems(quoteId);
  
  const doc = new PDFDocument({ margin: 50 });
  const chunks: Buffer[] = [];
  
  doc.on("data", (chunk) => chunks.push(chunk));
  
  await new Promise<void>((resolve, reject) => {
    doc.on("end", () => resolve());
    doc.on("error", reject);
    
    // Header
    doc.fontSize(24).text("QUOTE", { align: "center" });
    doc.moveDown();
    
    // Quote details
    doc.fontSize(12);
    doc.text(`Quote Number: ${quote.quoteNumber}`, { align: "right" });
    doc.text(`Date: ${new Date(quote.createdAt).toLocaleDateString()}`, { align: "right" });
    doc.text(`Status: ${quote.status.toUpperCase()}`, { align: "right" });
    doc.moveDown();
    
    // Customer details
    doc.fontSize(14).text("Bill To:", { underline: true });
    doc.fontSize(12);
    doc.text(customer.companyName);
    if (customer.contactName) doc.text(customer.contactName);
    if (customer.billingAddress) doc.text(customer.billingAddress);
    if (customer.email) doc.text(customer.email);
    if (customer.phone) doc.text(customer.phone);
    doc.moveDown(2);
    
    // Items table
    doc.fontSize(14).text("Items:", { underline: true });
    doc.moveDown();
    
    const tableTop = doc.y;
    const itemX = 50;
    const qtyX = 300;
    const priceX = 370;
    const totalX = 470;
    
    // Table headers
    doc.fontSize(10).font("Helvetica-Bold");
    doc.text("Item", itemX, tableTop);
    doc.text("Qty", qtyX, tableTop);
    doc.text("Price", priceX, tableTop);
    doc.text("Total", totalX, tableTop);
    
    doc.moveTo(itemX, tableTop + 15).lineTo(550, tableTop + 15).stroke();
    
    let y = tableTop + 25;
    doc.font("Helvetica");
    
    items.forEach((item) => {
      const qty = parseFloat(item.quantity);
      const price = parseFloat(item.sellPrice);
      const total = parseFloat(item.lineTotal);
      
      doc.text(item.itemName, itemX, y, { width: 240 });
      doc.text(qty.toFixed(2), qtyX, y);
      doc.text(`$${price.toFixed(2)}`, priceX, y);
      doc.text(`$${total.toFixed(2)}`, totalX, y);
      
      y += 25;
      
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
    });
    
    // Total
    doc.moveDown(2);
    doc.fontSize(12).font("Helvetica-Bold");
    doc.text(`Total: $${parseFloat(quote.totalAmount).toFixed(2)}`, { align: "right" });
    
    // Notes
    if (quote.notes) {
      doc.moveDown(2);
      doc.fontSize(10).font("Helvetica");
      doc.text("Notes:", { underline: true });
      doc.text(quote.notes);
    }
    
    doc.end();
  });
  
  const pdfBuffer = Buffer.concat(chunks);
  const fileKey = `quotes/${quote.quoteNumber}-${Date.now()}.pdf`;
  const { url } = await storagePut(fileKey, pdfBuffer, "application/pdf");
  
  await db.updateQuote(quoteId, { pdfUrl: url });
  
  return url;
}

/**
 * Generate a supplier-facing purchase order PDF
 * IMPORTANT: Must ONLY include buy prices, no sell prices or margins
 */
export async function generatePurchaseOrderPDF(poId: number): Promise<string> {
  const po = await db.getPurchaseOrderById(poId);
  if (!po) throw new Error("Purchase order not found");
  
  const supplier = await db.getSupplierById(po.supplierId);
  if (!supplier) throw new Error("Supplier not found");
  
  const items = await db.getPurchaseOrderItems(poId);
  
  const doc = new PDFDocument({ margin: 50 });
  const chunks: Buffer[] = [];
  
  doc.on("data", (chunk) => chunks.push(chunk));
  
  await new Promise<void>((resolve, reject) => {
    doc.on("end", () => resolve());
    doc.on("error", reject);
    
    // Header
    doc.fontSize(24).text("PURCHASE ORDER", { align: "center" });
    doc.moveDown();
    
    // PO details
    doc.fontSize(12);
    doc.text(`PO Number: ${po.poNumber}`, { align: "right" });
    doc.text(`Date: ${new Date(po.createdAt).toLocaleDateString()}`, { align: "right" });
    doc.text(`Status: ${po.status.toUpperCase()}`, { align: "right" });
    doc.moveDown();
    
    // Supplier details
    doc.fontSize(14).text("Supplier:", { underline: true });
    doc.fontSize(12);
    doc.text(supplier.companyName);
    if (supplier.billingAddress) doc.text(supplier.billingAddress);
    if (supplier.keyContactName) doc.text(`Contact: ${supplier.keyContactName}`);
    if (supplier.keyContactEmail) doc.text(supplier.keyContactEmail);
    doc.moveDown(2);
    
    // Items table
    doc.fontSize(14).text("Items:", { underline: true });
    doc.moveDown();
    
    const tableTop = doc.y;
    const itemX = 50;
    const qtyX = 350;
    const priceX = 420;
    const totalX = 490;
    
    // Table headers
    doc.fontSize(10).font("Helvetica-Bold");
    doc.text("Item", itemX, tableTop);
    doc.text("Qty", qtyX, tableTop);
    doc.text("Price", priceX, tableTop);
    doc.text("Total", totalX, tableTop);
    
    doc.moveTo(itemX, tableTop + 15).lineTo(550, tableTop + 15).stroke();
    
    let y = tableTop + 25;
    doc.font("Helvetica");
    
    items.forEach((item) => {
      const qty = parseFloat(item.quantity);
      const price = parseFloat(item.buyPrice);
      const total = parseFloat(item.lineTotal);
      
      doc.text(item.itemName, itemX, y, { width: 290 });
      doc.text(qty.toFixed(2), qtyX, y);
      doc.text(`$${price.toFixed(2)}`, priceX, y);
      doc.text(`$${total.toFixed(2)}`, totalX, y);
      
      y += 25;
      
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
    });
    
    // Total
    doc.moveDown(2);
    doc.fontSize(12).font("Helvetica-Bold");
    doc.text(`Total: $${parseFloat(po.totalAmount).toFixed(2)}`, { align: "right" });
    
    // Notes
    if (po.notes) {
      doc.moveDown(2);
      doc.fontSize(10).font("Helvetica");
      doc.text("Notes:", { underline: true });
      doc.text(po.notes);
    }
    
    doc.end();
  });
  
  const pdfBuffer = Buffer.concat(chunks);
  const fileKey = `purchase-orders/${po.poNumber}-${Date.now()}.pdf`;
  const { url } = await storagePut(fileKey, pdfBuffer, "application/pdf");
  
  await db.updatePurchaseOrder(poId, { pdfUrl: url });
  
  return url;
}
