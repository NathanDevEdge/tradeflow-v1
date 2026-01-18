import PDFDocument from "pdfkit";
import * as db from "./db";
import { storagePut } from "./storage";

const COLORS = {
  primary: "#2563eb",
  text: "#1f2937",
  secondary: "#6b7280",
  border: "#e5e7eb",
  background: "#f3f4f6",
};

const FONTS = {
  regular: "Helvetica",
  bold: "Helvetica-Bold",
};

/**
 * Draw premium header with company branding - REWRITTEN v2.0
 */
async function drawPremiumHeader(
  doc: PDFKit.PDFDocument,
  title: string,
  documentNumber: string,
  date: Date,
  status: string,
  organizationId: number
) {
  const settings = await db.getCompanySettings(organizationId);
  
  // Header background bar
  doc.rect(0, 0, 612, 120).fill(COLORS.primary);
  
  // Company logo placeholder
  if (settings?.logoUrl) {
    try {
      doc.rect(50, 30, 80, 60).stroke("#ffffff");
    } catch (error) {
      console.warn("Could not load company logo:", error);
    }
  }
  
  // Company details (white text on blue background)
  doc.fill("#ffffff").fontSize(18).font(FONTS.bold);
  doc.text(settings?.companyName || "Your Company", settings?.logoUrl ? 150 : 50, 35);
  
  doc.fontSize(9).font(FONTS.regular);
  if (settings?.abn) doc.text(`ABN: ${settings.abn}`, settings?.logoUrl ? 150 : 50, 58);
  if (settings?.address) {
    const addressLines = settings.address.split("\n");
    let y = settings?.abn ? 72 : 58;
    addressLines.forEach(line => {
      doc.text(line, settings?.logoUrl ? 150 : 50, y);
      y += 12;
    });
  }
  
  // Document title and number (right side) - FIXED COORDINATES
  doc.fontSize(20).font(FONTS.bold).fill("#ffffff");
  doc.text(title, 300, 25, { align: "right", width: 262 });
  
  doc.fontSize(10).font(FONTS.regular);
  doc.text(documentNumber, 300, 50, { align: "right", width: 262 });
  doc.text(`Date: ${date.toLocaleDateString("en-AU")}`, 300, 68, { align: "right", width: 262 });
  
  // Status badge
  const statusY = 100;
  const statusText = status.toUpperCase();
  const statusWidth = doc.widthOfString(statusText) + 20;
  const statusX = 550 - statusWidth;
  
  doc.roundedRect(statusX, statusY, statusWidth, 18, 3).fill("#ffffff");
  doc.fontSize(9).font(FONTS.bold).fill(COLORS.primary);
  doc.text(statusText, statusX, statusY + 5, { width: statusWidth, align: "center" });
  
  // Reset fill color
  doc.fill(COLORS.text);
  
  return 140; // Return Y position after header
}

/**
 * Draw recipient details in a card-style box
 */
function drawRecipientCard(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  title: string,
  name: string,
  address: string,
  email?: string,
  city?: string
) {
  // Card background
  doc.rect(x, y, width, 90).fill(COLORS.background);
  
  // Title
  doc.fontSize(9).font(FONTS.bold).fill(COLORS.secondary);
  doc.text(title, x + 15, y + 15);
  
  // Recipient name
  doc.fontSize(11).font(FONTS.bold).fill(COLORS.text);
  doc.text(name, x + 15, y + 30);
  
  // Address
  doc.fontSize(9).font(FONTS.regular).fill(COLORS.secondary);
  let detailY = y + 45;
  if (address) {
    doc.text(address, x + 15, detailY);
    detailY += 12;
  }
  if (email) {
    doc.text(email, x + 15, detailY);
    detailY += 12;
  }
  if (city) {
    doc.text(city, x + 15, detailY);
  }
}

/**
 * Helper to draw a professional table with items
 */
function drawItemsTable(
  doc: PDFKit.PDFDocument,
  y: number,
  items: any[],
  columns: { label: string; width: number; align?: "left" | "right" | "center" }[],
  rowRenderer: (item: any, x: number, y: number, columns: { label: string; width: number; align?: "left" | "right" | "center" }[]) => void
) {
  const tableX = 50;
  const tableWidth = 495;
  
  // Table header background
  doc.rect(tableX, y, tableWidth, 30).fill(COLORS.background);
  
  // Table header text
  let currentX = tableX;
  doc.fontSize(10).font(FONTS.bold).fill(COLORS.text);
  columns.forEach(col => {
    doc.text(col.label, currentX + 10, y + 10, {
      width: col.width - 10,
      align: col.align || "left"
    });
    currentX += col.width;
  });
  
  y += 30;
  
  // Table rows
  items.forEach((item, index) => {
    // Alternate row background
    if (index % 2 === 0) {
      doc.rect(tableX, y, tableWidth, 30).fill("#ffffff");
    } else {
      doc.rect(tableX, y, tableWidth, 30).fill("#fafafa");
    }
    
    // Reset text styling for each row
    doc.fontSize(10).font(FONTS.regular).fill(COLORS.text);
    rowRenderer(item, tableX, y, columns);
    y += 30;
  });
  
  // Bottom border
  doc.moveTo(tableX, y).lineTo(tableX + tableWidth, y).stroke(COLORS.border);
  
  return y + 20;
}

/**
 * Draw totals section - REWRITTEN v2.0 WITH FIXED WIDTH
 */
function drawTotalsSection(
  doc: PDFKit.PDFDocument,
  y: number,
  totals: { label: string; value: string; bold?: boolean }[]
) {
  const totalsX = 310;
  const labelWidth = 120;
  const valueWidth = 115; // INCREASED to show full decimal values
  
  totals.forEach((total, index) => {
    const isLast = index === totals.length - 1;
    
    if (total.bold || isLast) {
      doc.fontSize(12).font(FONTS.bold);
    } else {
      doc.fontSize(11).font(FONTS.regular);
    }
    
    doc.fill(COLORS.text);
    doc.text(total.label, totalsX, y, { width: labelWidth, align: "right" });
    doc.text(total.value, totalsX + labelWidth, y, { width: valueWidth, align: "right" });
    
    if (isLast) {
      // Underline for total
      doc.moveTo(totalsX, y - 5)
         .lineTo(totalsX + labelWidth + valueWidth, y - 5)
         .stroke(COLORS.border);
    }
    
    y += isLast ? 30 : 20;
  });
  
  return y;
}

/**
 * Draw footer with company info and page number
 */
async function drawFooter(doc: PDFKit.PDFDocument, pageNumber: number, totalPages: number, organizationId: number) {
  const settings = await db.getCompanySettings(organizationId);
  
  doc.fontSize(8).font(FONTS.regular).fill(COLORS.secondary);
  
  // Footer line
  doc.moveTo(50, 770).lineTo(562, 770).stroke(COLORS.border);
  
  // Company contact info
  let footerText = "";
  if (settings?.phone) footerText += `Phone: ${settings.phone}  `;
  if (settings?.email) footerText += `Email: ${settings.email}`;
  
  doc.text(footerText, 50, 780, { width: 400, align: "left" });
  
  // Page number
  doc.text(`Page ${pageNumber} of ${totalPages}`, 50, 780, { width: 512, align: "right" });
}

/**
 * Generate a customer-facing quote PDF
 * IMPORTANT: Must NOT include buy prices or margin data
 */
export async function generateQuotePDF(quoteId: number, organizationId: number): Promise<string> {
  const quote = await db.getQuoteById(quoteId, organizationId);
  if (!quote) throw new Error("Quote not found");
  
  const customer = await db.getCustomerById(quote.customerId, organizationId);
  if (!customer) throw new Error("Customer not found");
  
  const items = await db.getQuoteItems(quoteId);
  
  const doc = new PDFDocument({ 
    margin: 0,
    size: "A4",
    bufferPages: true
  });
  const chunks: Buffer[] = [];
  
  doc.on("data", (chunk) => chunks.push(chunk));
  
  await new Promise<void>((resolve, reject) => {
    doc.on("end", () => resolve());
    doc.on("error", reject);
    
    (async () => {
      try {
        // Premium header
        let y = await drawPremiumHeader(
          doc,
          "QUOTE",
          quote.quoteNumber,
          new Date(quote.createdAt),
          quote.status,
          organizationId
        );
        
        // Customer details card
        drawRecipientCard(
          doc,
          50,
          y,
          240,
          "BILL TO",
          customer.companyName,
          customer.billingAddress || "",
          customer.email || "",
          ""
        );
        
        y += 140;
        
        // Items table
        const columns = [
          { label: "ITEM", width: 235, align: "left" as const },
          { label: "QTY", width: 70, align: "right" as const },
          { label: "UNIT PRICE", width: 95, align: "right" as const },
          { label: "TOTAL", width: 95, align: "right" as const },
        ];
        
        y = drawItemsTable(
          doc,
          y,
          items,
          columns,
          (item, x, y, cols) => {
            doc.text(item.itemName, x + 10, y + 10, { width: cols[0].width - 10 });
            doc.text(parseFloat(item.quantity).toFixed(2), x + cols[0].width, y + 10, { 
              width: cols[1].width, 
              align: "right" 
            });
            doc.text(`$${parseFloat(item.sellPrice).toFixed(2)}`, x + cols[0].width + cols[1].width, y + 10, { 
              width: cols[2].width, 
              align: "right" 
            });
            doc.text(`$${parseFloat(item.lineTotal).toFixed(2)}`, x + cols[0].width + cols[1].width + cols[2].width, y + 10, { 
              width: cols[3].width, 
              align: "right" 
            });
          }
        );
        
        // Calculate totals
        const subtotal = parseFloat(quote.totalAmount);
        const gst = subtotal * 0.1;
        const total = subtotal + gst;
        
        y = drawTotalsSection(doc, y, [
          { label: "Subtotal", value: `$${subtotal.toFixed(2)}` },
          { label: "GST (10%)", value: `$${gst.toFixed(2)}` },
          { label: "TOTAL", value: `$${total.toFixed(2)}`, bold: true },
        ]);
        
        // Notes section
        if (quote.notes) {
          y += 20;
          doc.fontSize(10).font(FONTS.bold).fill(COLORS.text);
          doc.text("NOTES", 50, y);
          y += 20;
          doc.fontSize(9).font(FONTS.regular).fill(COLORS.secondary);
          doc.text(quote.notes, 50, y, { width: 512 });
        }
        
        // Footer
        await drawFooter(doc, 1, 1, organizationId);
        
        doc.end();
      } catch (error) {
        reject(error);
      }
    })();
  });
  
  const pdfBuffer = Buffer.concat(chunks);
  const fileName = `quote-${quote.quoteNumber}-${Date.now()}.pdf`;
  const { url } = await storagePut(fileName, pdfBuffer, "application/pdf");
  
  return url;
}

/**
 * Generate a supplier-facing purchase order PDF
 * IMPORTANT: Must include buy prices, NOT sell prices or margins
 */
export async function generatePurchaseOrderPDF(poId: number, organizationId: number): Promise<string> {
  const po = await db.getPurchaseOrderById(poId, organizationId);
  if (!po) throw new Error("Purchase order not found");
  
  const supplier = await db.getSupplierById(po.supplierId, organizationId);
  if (!supplier) throw new Error("Supplier not found");
  
  const items = await db.getPurchaseOrderItems(poId);
  
  const doc = new PDFDocument({ 
    margin: 0,
    size: "A4",
    bufferPages: true
  });
  const chunks: Buffer[] = [];
  
  doc.on("data", (chunk) => chunks.push(chunk));
  
  await new Promise<void>((resolve, reject) => {
    doc.on("end", () => resolve());
    doc.on("error", reject);
    
    (async () => {
      try {
        // Premium header
        let y = await drawPremiumHeader(
          doc,
          "PURCHASE ORDER",
          po.poNumber,
          new Date(po.createdAt),
          po.status,
          organizationId
        );
        
        // Supplier and delivery info cards
        drawRecipientCard(
          doc,
          50,
          y,
          240,
          "SUPPLIER",
          supplier.companyName,
          supplier.billingAddress || "",
          supplier.poEmail || "",
          ""
        );
        
        drawRecipientCard(
          doc,
          305,
          y,
          240,
          "DELIVERY",
          po.deliveryMethod || "Pickup from Supplier",
          "",
          "",
          ""
        );
        
        y += 140;
        
        // Items table
        const columns = [
          { label: "ITEM", width: 235, align: "left" as const },
          { label: "QTY", width: 70, align: "right" as const },
          { label: "BUY PRICE", width: 95, align: "right" as const },
          { label: "TOTAL", width: 95, align: "right" as const },
        ];
        
        y = drawItemsTable(
          doc,
          y,
          items,
          columns,
          (item, x, y, cols) => {
            doc.text(item.itemName, x + 10, y + 10, { width: cols[0].width - 10 });
            doc.text(parseFloat(item.quantity).toFixed(2), x + cols[0].width, y + 10, { 
              width: cols[1].width, 
              align: "right" 
            });
            doc.text(`$${parseFloat(item.buyPrice).toFixed(2)}`, x + cols[0].width + cols[1].width, y + 10, { 
              width: cols[2].width, 
              align: "right" 
            });
            doc.text(`$${parseFloat(item.lineTotal).toFixed(2)}`, x + cols[0].width + cols[1].width + cols[2].width, y + 10, { 
              width: cols[3].width, 
              align: "right" 
            });
          }
        );
        
        // Calculate totals
        const subtotal = parseFloat(po.totalAmount);
        const gst = subtotal * 0.1;
        const total = subtotal + gst;
        
        y = drawTotalsSection(doc, y, [
          { label: "Subtotal", value: `$${subtotal.toFixed(2)}` },
          { label: "GST (10%)", value: `$${gst.toFixed(2)}` },
          { label: "TOTAL", value: `$${total.toFixed(2)}`, bold: true },
        ]);
        
        // Notes section
        if (po.notes) {
          y += 20;
          doc.fontSize(10).font(FONTS.bold).fill(COLORS.text);
          doc.text("NOTES", 50, y);
          y += 20;
          doc.fontSize(9).font(FONTS.regular).fill(COLORS.secondary);
          doc.text(po.notes, 50, y, { width: 512 });
        }
        
        // Footer
        await drawFooter(doc, 1, 1, organizationId);
        
        doc.end();
      } catch (error) {
        reject(error);
      }
    })();
  });
  
  const pdfBuffer = Buffer.concat(chunks);
  const fileName = `po-${po.poNumber}-${Date.now()}.pdf`;
  const { url } = await storagePut(fileName, pdfBuffer, "application/pdf");
  
  return url;
}
