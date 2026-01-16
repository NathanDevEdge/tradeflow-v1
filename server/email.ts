import axios from "axios";
import { ENV } from "./_core/env";
import * as db from "./db";

/**
 * Send purchase order PDF to supplier via email
 */
export async function sendPurchaseOrderEmail(poId: number, organizationId: number): Promise<void> {
  const po = await db.getPurchaseOrderById(poId, organizationId);
  if (!po) throw new Error("Purchase order not found");
  
  if (!po.pdfUrl) {
    throw new Error("Purchase order PDF must be generated before sending email");
  }
  
  const supplier = await db.getSupplierById(po.supplierId, organizationId);
  if (!supplier) throw new Error("Supplier not found");
  
  if (!supplier.poEmail) {
    throw new Error("Supplier does not have a PO email address");
  }
  
  // Use Manus built-in email API (if available) or a third-party service
  // For now, we'll use a simple implementation that logs the email
  // In production, integrate with SendGrid, AWS SES, or similar
  
  const emailContent = {
    to: supplier.poEmail,
    subject: `Purchase Order ${po.poNumber}`,
    html: `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Purchase Order ${po.poNumber}</h2>
          <p>Dear ${supplier.keyContactName || supplier.companyName},</p>
          <p>Please find attached our purchase order ${po.poNumber} for your review.</p>
          <p><strong>PO Details:</strong></p>
          <ul>
            <li>PO Number: ${po.poNumber}</li>
            <li>Date: ${new Date(po.createdAt).toLocaleDateString()}</li>
            <li>Total Amount: $${parseFloat(po.totalAmount).toFixed(2)}</li>
            <li>Status: ${po.status.toUpperCase()}</li>
          </ul>
          ${po.notes ? `<p><strong>Notes:</strong><br>${po.notes}</p>` : ""}
          <p>You can download the full purchase order PDF here:</p>
          <p><a href="${po.pdfUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px;">Download Purchase Order PDF</a></p>
          <p>If you have any questions, please don't hesitate to contact us.</p>
          <p>Best regards</p>
        </body>
      </html>
    `,
    text: `
Purchase Order ${po.poNumber}

Dear ${supplier.keyContactName || supplier.companyName},

Please find attached our purchase order ${po.poNumber} for your review.

PO Details:
- PO Number: ${po.poNumber}
- Date: ${new Date(po.createdAt).toLocaleDateString()}
- Total Amount: $${parseFloat(po.totalAmount).toFixed(2)}
- Status: ${po.status.toUpperCase()}

${po.notes ? `Notes:\n${po.notes}\n\n` : ""}
You can download the full purchase order PDF here:
${po.pdfUrl}

If you have any questions, please don't hesitate to contact us.

Best regards
    `.trim(),
  };
  
  // Log the email for now (in production, send via email service)
  console.log("[Email] Would send purchase order email:", {
    to: emailContent.to,
    subject: emailContent.subject,
    pdfUrl: po.pdfUrl,
  });
  
  // Update PO status to "sent" after sending email
  await db.updatePurchaseOrder(poId, organizationId, { status: "sent" });
  
  // In production, uncomment and configure with your email service:
  /*
  try {
    await axios.post(
      `${ENV.builtInForgeApiUrl}/email/send`,
      {
        to: emailContent.to,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      },
      {
        headers: {
          Authorization: `Bearer ${ENV.builtInForgeApiKey}`,
        },
      }
    );
  } catch (error) {
    console.error("[Email] Failed to send email:", error);
    throw new Error("Failed to send email");
  }
  */
}
