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

/**
 * Generic email sending function using Manus notification system
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  // For now, use notifyOwner to send emails to admin
  // In production, integrate with a proper email service
  const { notifyOwner } = await import("./_core/notification");
  
  try {
    await notifyOwner({
      title: params.subject,
      content: `To: ${params.to}\n\n${params.text}`,
    });
  } catch (error) {
    console.error("[Email] Failed to send email:", error);
    throw new Error("Failed to send email");
  }
}

/**
 * Send user invitation email with registration link
 */
export async function sendInvitationEmail(params: {
  email: string;
  name: string;
  organizationName: string;
  inviterName: string;
}): Promise<void> {
  const registrationUrl = `${process.env.VITE_APP_URL || 'http://localhost:3000'}/register?email=${encodeURIComponent(params.email)}`;
  
  const html = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">You've been invited to TradeFlow!</h2>
          <p>Hi ${params.name},</p>
          <p>${params.inviterName} has invited you to join <strong>${params.organizationName}</strong> on TradeFlow.</p>
          <p>TradeFlow is a professional quoting and purchase order management system designed for wholesale distribution.</p>
          <p>Click the button below to create your account and get started:</p>
          <div style="margin: 30px 0;">
            <a href="${registrationUrl}" style="display: inline-block; padding: 12px 30px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Create Your Account</a>
          </div>
          <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
          <p style="color: #666; font-size: 14px; word-break: break-all;">${registrationUrl}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
      </body>
    </html>
  `;
  
  const text = `
You've been invited to TradeFlow!

Hi ${params.name},

${params.inviterName} has invited you to join ${params.organizationName} on TradeFlow.

TradeFlow is a professional quoting and purchase order management system designed for wholesale distribution.

Create your account by visiting:
${registrationUrl}

If you didn't expect this invitation, you can safely ignore this email.
  `.trim();
  
  await sendEmail({
    to: params.email,
    subject: `You've been invited to ${params.organizationName} on TradeFlow`,
    html,
    text,
  });
}
