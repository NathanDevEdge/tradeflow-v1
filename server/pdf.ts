import PDFDocument from "pdfkit";
import { storagePut } from "./storage";
import * as db from "./db";

/**
 * Premium PDF styling constants
 */
const COLORS = {
  primary: "#1a56db", // Professional blue
  secondary: "#6b7280", // Muted gray
  text: "#111827", // Dark gray
  border: "#e5e7eb", // Light gray
  background: "#f9fafb", // Very light gray
};

const FONTS = {
  regular: "Helvetica",
  bold: "Helvetica-Bold",
  italic: "Helvetica-Oblique",
};

/**
 * Helper to draw a professional header with company logo and branding
 */
async function drawPremiumHeader(
  doc: PDFKit.PDFDocument,
  title: string,
  documentNumber: string,
  date: Date,
  status: string
) {
  const settings = await db.getCompanySettings();
  
  // Header background bar
  doc.rect(0, 0, 612, 120).fill(COLORS.primary);
  
  // Company logo (if available)
  if (settings?.logoUrl) {
    try {
      // Note: In production, you'd fetch and embed the logo
      // For now, we'll just reserve space for it
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
  
  // Document title and number (right side)
  doc.fontSize(28).font(FONTS.bold).fill("#ffffff");
  doc.text(title, 350, 35, { align: "right", width: 200 });
  
  doc.fontSize(11).font(FONTS.regular);
  doc.text(documentNumber, 350, 70, { align: "right", width: 200 });
  doc.text(`Date: ${date.toLocaleDateString("en-AU")}`, 350, 85, { align: "right", width: 200 });
  
  // Status badge
  const statusY = 100;
  const statusText = status.toUpperCase();
  const statusWidth = doc.widthOfString(statusText) + 20;
  const statusX = 550 - statusWidth;
  
  doc.roundedRect(statusX, statusY, statusWidth, 18, 3)
     .fill("#ffffff");
  doc.fontSize(9).font(FONTS.bold).fill(COLORS.primary);
  doc.text(statusText, statusX, statusY + 5, { width: statusWidth, align: "center" });
  
  // Reset fill color
  doc.fill(COLORS.text);
  
  return 140; // Return Y position after header
}

/**
 * Helper to draw recipient details in a card-style box
 */
function drawRecipientCard(
  doc: PDFKit.PDFDocument,
  y: number,
  title: string,
  name: string,
  address?: string | null,
  email?: string | null,
  phone?: string | null
) {
  const cardX = 50;
  const cardWidth = 250;
  const cardY = y;
  
  // Card background
  doc.rect(cardX, cardY, cardWidth, 120)
     .fill(COLORS.background)
     .stroke(COLORS.border);
  
  // Card title
  doc.fontSize(10).font(FONTS.bold).fill(COLORS.secondary);
  doc.text(title, cardX + 15, cardY + 15);
  
  // Recipient details
  doc.fontSize(11).font(FONTS.bold).fill(COLORS.text);
  doc.text(name, cardX + 15, cardY + 35, { width: cardWidth - 30 });
  
  doc.fontSize(9).font(FONTS.regular).fill(COLORS.secondary);
  let detailY = cardY + 52;
  
  if (address) {
    const addressLines = address.split("\n");
    addressLines.forEach(line => {
      doc.text(line, cardX + 15, detailY, { width: cardWidth - 30 });
      detailY += 12;
    });
  }
  
  if (email) {
    doc.text(email, cardX + 15, detailY, { width: cardWidth - 30 });
    detailY += 12;
  }
  
  if (phone) {
    doc.text(phone, cardX + 15, detailY, { width: cardWidth - 30 });
  }
  
  doc.fill(COLORS.text);
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
  const tableWidth = 512;
  
  // Table header background
  doc.rect(tableX, y, tableWidth, 30)
     .fill(COLORS.background);
  
  // Column headers
  doc.fontSize(10).font(FONTS.bold).fill(COLORS.text);
  let currentX = tableX + 15;
  
  columns.forEach(col => {
    doc.text(col.label, currentX, y + 10, { width: col.width, align: col.align || "left" });
    currentX += col.width;
  });
  
  // Header border
  doc.moveTo(tableX, y + 30)
     .lineTo(tableX + tableWidth, y + 30)
     .stroke(COLORS.border);
  
  // Table rows
  let rowY = y + 40;
  doc.fontSize(10).font(FONTS.regular);
  
  items.forEach((item, index) => {
    // Alternating row background
    if (index % 2 === 0) {
      doc.rect(tableX, rowY - 5, tableWidth, 30)
         .fill("#ffffff");
    } else {
      doc.rect(tableX, rowY - 5, tableWidth, 30)
         .fill(COLORS.background);
    }
    
    rowRenderer(item, tableX + 15, rowY, columns);
    
    rowY += 30;
    
    // Page break if needed
    if (rowY > 700) {
      doc.addPage();
      rowY = 50;
    }
  });
  
  // Bottom border
  doc.moveTo(tableX, rowY)
     .lineTo(tableX + tableWidth, rowY)
     .stroke(COLORS.border);
  
  return rowY + 20;
}

/**
 * Helper to draw totals section
 */
function drawTotalsSection(
  doc: PDFKit.PDFDocument,
  y: number,
  totals: { label: string; value: string; bold?: boolean }[]
) {
  const totalsX = 350;
  const labelWidth = 150;
  const valueWidth = 100;
  
  totals.forEach((total, index) => {
    const isLast = index === totals.length - 1;
    
    if (total.bold || isLast) {
      doc.fontSize(12).font(FONTS.bold);
    } else {
      doc.fontSize(10).font(FONTS.regular);
    }
    
    doc.fill(COLORS.text);
    doc.text(total.label, totalsX, y);
    doc.text(total.value, totalsX + labelWidth, y, { width: valueWidth, align: "right" });
    
    y += isLast ? 25 : 20;
    
    if (isLast) {
      // Draw line above grand total
      doc.moveTo(totalsX, y - 10)
         .lineTo(totalsX + labelWidth + valueWidth, y - 10)
         .stroke(COLORS.border);
    }
  });
  
  return y;
}

/**
 * Helper to draw footer
 */
async function drawFooter(doc: PDFKit.PDFDocument, pageNumber: number, totalPages: number) {
  const settings = await db.getCompanySettings();
  
  doc.fontSize(8).font(FONTS.regular).fill(COLORS.secondary);
  
  // Footer line
  doc.moveTo(50, 770)
     .lineTo(562, 770)
     .stroke(COLORS.border);
  
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
export async function generateQuotePDF(quoteId: number): Promise<string> {
  const quote = await db.getQuoteById(quoteId);
  if (!quote) throw new Error("Quote not found");
  
  const customer = await db.getCustomerById(quote.customerId);
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
          quote.status
        );
        
        y += 20;
        
        // Customer details card
        drawRecipientCard(
          doc,
          y,
          "BILL TO",
          customer.companyName,
          customer.billingAddress,
          customer.email,
          customer.phone
        );
        
        y += 140;
        
        // Items table
        const columns = [
          { label: "ITEM", width: 250, align: "left" as const },
          { label: "QTY", width: 80, align: "right" as const },
          { label: "UNIT PRICE", width: 90, align: "right" as const },
          { label: "TOTAL", width: 92, align: "right" as const },
        ];
        
        y = drawItemsTable(
          doc,
          y,
          items,
          columns,
          (item, x, y, cols) => {
            const qty = parseFloat(item.quantity);
            const price = parseFloat(item.sellPrice);
            const total = parseFloat(item.lineTotal);
            
            doc.fill(COLORS.text);
            doc.text(item.itemName, x, y, { width: cols[0].width - 15 });
            doc.text(qty.toFixed(2), x + cols[0].width, y, { width: cols[1].width - 15, align: "right" });
            doc.text(`$${price.toFixed(2)}`, x + cols[0].width + cols[1].width, y, { width: cols[2].width - 15, align: "right" });
            doc.text(`$${total.toFixed(2)}`, x + cols[0].width + cols[1].width + cols[2].width, y, { width: cols[3].width - 15, align: "right" });
          }
        );
        
        y += 20;
        
        // Calculate totals
        const subtotal = parseFloat(quote.totalAmount);
        const gst = subtotal * 0.1;
        const grandTotal = subtotal + gst;
        
        // Totals section
        y = drawTotalsSection(doc, y, [
          { label: "Subtotal", value: `$${subtotal.toFixed(2)}` },
          { label: "GST (10%)", value: `$${gst.toFixed(2)}` },
          { label: "TOTAL", value: `$${grandTotal.toFixed(2)}`, bold: true },
        ]);
        
        // Notes section
        if (quote.notes) {
          y += 30;
          doc.fontSize(10).font(FONTS.bold).fill(COLORS.text);
          doc.text("NOTES", 50, y);
          y += 20;
          doc.fontSize(9).font(FONTS.regular).fill(COLORS.secondary);
          doc.text(quote.notes, 50, y, { width: 512 });
        }
        
        // Add page numbers
        const range = doc.bufferedPageRange();
        for (let i = 0; i < range.count; i++) {
          doc.switchToPage(i);
          await drawFooter(doc, i + 1, range.count);
        }
        
        doc.end();
      } catch (error) {
        reject(error);
      }
    })();
  });
  
  const pdfBuffer = Buffer.concat(chunks);
  const timestamp = Date.now();
  const fileKey = `pdfs/quote-${quote.quoteNumber}-${timestamp}.pdf`;
  const { url } = await storagePut(fileKey, pdfBuffer, "application/pdf");
  
  return url;
}

/**
 * Generate a supplier-facing purchase order PDF
 * IMPORTANT: Must include buy prices but NOT sell prices or margins
 */
export async function generatePurchaseOrderPDF(purchaseOrderId: number): Promise<string> {
  const po = await db.getPurchaseOrderById(purchaseOrderId);
  if (!po) throw new Error("Purchase order not found");
  
  const supplier = await db.getSupplierById(po.supplierId);
  if (!supplier) throw new Error("Supplier not found");
  
  const items = await db.getPurchaseOrderItems(purchaseOrderId);
  
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
          po.status
        );
        
        y += 20;
        
        // Supplier details card
        drawRecipientCard(
          doc,
          y,
          "SUPPLIER",
          supplier.companyName,
          supplier.billingAddress,
          supplier.poEmail,
          null
        );
        
        // Delivery information card (right side)
        if (po.deliveryMethod) {
          const deliveryX = 320;
          const cardWidth = 242;
          const cardY = y;
          
          // Card background
          doc.rect(deliveryX, cardY, cardWidth, 120)
             .fill(COLORS.background)
             .stroke(COLORS.border);
          
          // Card title
          doc.fontSize(10).font(FONTS.bold).fill(COLORS.secondary);
          doc.text("DELIVERY", deliveryX + 15, cardY + 15);
          
          // Delivery details
          doc.fontSize(11).font(FONTS.bold).fill(COLORS.text);
          const deliveryLabel = po.deliveryMethod === "in_store_delivery" ? "In-Store Delivery" : "Pickup from Supplier";
          doc.text(deliveryLabel, deliveryX + 15, cardY + 35, { width: cardWidth - 30 });
          
          if (po.deliveryMethod === "in_store_delivery" && po.shippingAddress) {
            doc.fontSize(9).font(FONTS.regular).fill(COLORS.secondary);
            let detailY = cardY + 52;
            const addressLines = po.shippingAddress.split("\n");
            addressLines.forEach(line => {
              doc.text(line, deliveryX + 15, detailY, { width: cardWidth - 30 });
              detailY += 12;
            });
          }
          
          doc.fill(COLORS.text);
        }
        
        y += 140;
        
        // Items table
        const columns = [
          { label: "ITEM", width: 250, align: "left" as const },
          { label: "QTY", width: 80, align: "right" as const },
          { label: "BUY PRICE", width: 90, align: "right" as const },
          { label: "TOTAL", width: 92, align: "right" as const },
        ];
        
        y = drawItemsTable(
          doc,
          y,
          items,
          columns,
          (item, x, y, cols) => {
            const qty = parseFloat(item.quantity);
            const price = parseFloat(item.buyPrice);
            const total = parseFloat(item.lineTotal);
            
            doc.fill(COLORS.text);
            doc.text(item.itemName, x, y, { width: cols[0].width - 15 });
            doc.text(qty.toFixed(2), x + cols[0].width, y, { width: cols[1].width - 15, align: "right" });
            doc.text(`$${price.toFixed(2)}`, x + cols[0].width + cols[1].width, y, { width: cols[2].width - 15, align: "right" });
            doc.text(`$${total.toFixed(2)}`, x + cols[0].width + cols[1].width + cols[2].width, y, { width: cols[3].width - 15, align: "right" });
          }
        );
        
        y += 20;
        
        // Calculate totals
        const subtotal = parseFloat(po.totalAmount);
        const gst = subtotal * 0.1;
        const grandTotal = subtotal + gst;
        
        // Totals section
        y = drawTotalsSection(doc, y, [
          { label: "Subtotal", value: `$${subtotal.toFixed(2)}` },
          { label: "GST (10%)", value: `$${gst.toFixed(2)}` },
          { label: "TOTAL", value: `$${grandTotal.toFixed(2)}`, bold: true },
        ]);
        
        // Notes section
        if (po.notes) {
          y += 30;
          doc.fontSize(10).font(FONTS.bold).fill(COLORS.text);
          doc.text("NOTES", 50, y);
          y += 20;
          doc.fontSize(9).font(FONTS.regular).fill(COLORS.secondary);
          doc.text(po.notes, 50, y, { width: 512 });
        }
        
        // Add page numbers
        const range = doc.bufferedPageRange();
        for (let i = 0; i < range.count; i++) {
          doc.switchToPage(i);
          await drawFooter(doc, i + 1, range.count);
        }
        
        doc.end();
      } catch (error) {
        reject(error);
      }
    })();
  });
  
  const pdfBuffer = Buffer.concat(chunks);
  const timestamp = Date.now();
  const fileKey = `pdfs/po-${po.poNumber}-${timestamp}.pdf`;
  const { url } = await storagePut(fileKey, pdfBuffer, "application/pdf");
  
  return url;
}
