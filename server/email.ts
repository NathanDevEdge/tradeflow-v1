import { Resend } from "resend";
import nodemailer from "nodemailer";
import { ENV } from "./_core/env";
import * as db from "./db";

// ---------------------------------------------------------------------------
// Core senders
// ---------------------------------------------------------------------------

/**
 * Send a system email (password reset, invitations) via Resend.
 * Always uses noreply@devedge.com.au.
 */
export async function sendSystemEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  if (!ENV.resendApiKey) {
    console.warn("[Email] RESEND_API_KEY not set — logging email instead");
    console.log("[Email] To:", params.to, "| Subject:", params.subject);
    return;
  }

  const resend = new Resend(ENV.resendApiKey);
  const { error } = await resend.emails.send({
    from: `TradeFlow <${ENV.fromEmail}>`,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
  });

  if (error) {
    console.error("[Email] Resend error:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

/**
 * Send a purchase order email.
 * Uses the org's SMTP if configured, otherwise falls back to Resend
 * with the org's name as the display name and their email as Reply-To.
 */
async function sendPOEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
  orgName: string;
  orgEmail: string | null;
  orgSettings: Awaited<ReturnType<typeof db.getCompanySettings>>;
}): Promise<void> {
  const { orgSettings } = params;

  // --- Option B: org has SMTP configured ---
  if (
    orgSettings?.smtpHost &&
    orgSettings?.smtpUser &&
    orgSettings?.smtpPassword &&
    orgSettings?.smtpFromEmail
  ) {
    const transporter = nodemailer.createTransport({
      host: orgSettings.smtpHost,
      port: orgSettings.smtpPort ?? 587,
      secure: orgSettings.smtpSecure === 1, // true = SSL, false = STARTTLS
      auth: {
        user: orgSettings.smtpUser,
        pass: orgSettings.smtpPassword,
      },
    });

    await transporter.sendMail({
      from: `"${orgSettings.smtpFromName || orgSettings.companyName || params.orgName}" <${orgSettings.smtpFromEmail}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    console.log(`[Email] PO sent via org SMTP from ${orgSettings.smtpFromEmail} to ${params.to}`);
    return;
  }

  // --- Option A: fall back to Resend with org display name ---
  if (!ENV.resendApiKey) {
    console.warn("[Email] RESEND_API_KEY not set — logging PO email instead");
    console.log("[Email] To:", params.to, "| Subject:", params.subject);
    return;
  }

  const resend = new Resend(ENV.resendApiKey);
  const { error } = await resend.emails.send({
    from: `${params.orgName} <${ENV.fromEmail}>`,
    to: params.to,
    replyTo: params.orgEmail ?? ENV.fromEmail,
    subject: params.subject,
    html: params.html,
    text: params.text,
  });

  if (error) {
    console.error("[Email] Resend error:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }

  console.log(`[Email] PO sent via Resend (as ${params.orgName}) to ${params.to}`);
}

// ---------------------------------------------------------------------------
// Business emails
// ---------------------------------------------------------------------------

/**
 * Send a purchase order PDF to the supplier.
 */
export async function sendPurchaseOrderEmail(
  poId: number,
  organizationId: number
): Promise<void> {
  const po = await db.getPurchaseOrderById(poId, organizationId);
  if (!po) throw new Error("Purchase order not found");
  if (!po.pdfUrl) throw new Error("Purchase order PDF must be generated before sending");

  const supplier = await db.getSupplierById(po.supplierId, organizationId);
  if (!supplier) throw new Error("Supplier not found");
  if (!supplier.poEmail) throw new Error("Supplier does not have a PO email address");

  const orgSettings = await db.getCompanySettings(organizationId);
  const orgName = orgSettings?.companyName ?? "TradeFlow";
  const orgEmail = orgSettings?.email ?? null;

  const subject = `Purchase Order ${po.poNumber} from ${orgName}`;

  const html = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1e40af;">Purchase Order ${po.poNumber}</h2>
        <p>Dear ${supplier.keyContactName || supplier.companyName},</p>
        <p>Please find our purchase order ${po.poNumber} attached for your review.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background: #f3f4f6;">
            <td style="padding: 8px 12px; font-weight: 600;">PO Number</td>
            <td style="padding: 8px 12px;">${po.poNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: 600;">Date</td>
            <td style="padding: 8px 12px;">${new Date(po.createdAt).toLocaleDateString("en-AU")}</td>
          </tr>
          <tr style="background: #f3f4f6;">
            <td style="padding: 8px 12px; font-weight: 600;">Total Amount</td>
            <td style="padding: 8px 12px;">$${parseFloat(po.totalAmount).toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: 600;">Delivery</td>
            <td style="padding: 8px 12px;">${po.deliveryMethod === "in_store_delivery" ? "Delivery to our address" : "Pickup from supplier"}</td>
          </tr>
        </table>
        ${po.notes ? `<p><strong>Notes:</strong> ${po.notes}</p>` : ""}
        <div style="margin: 30px 0;">
          <a href="${po.pdfUrl}" style="display: inline-block; padding: 12px 24px; background-color: #1e40af; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
            Download Purchase Order PDF
          </a>
        </div>
        <p>If you have any questions, please don't hesitate to contact us.</p>
        <p>Kind regards,<br><strong>${orgName}</strong></p>
      </body>
    </html>
  `;

  const text = `
Purchase Order ${po.poNumber} from ${orgName}

Dear ${supplier.keyContactName || supplier.companyName},

Please find our purchase order ${po.poNumber} attached for your review.

PO Number: ${po.poNumber}
Date: ${new Date(po.createdAt).toLocaleDateString("en-AU")}
Total Amount: $${parseFloat(po.totalAmount).toFixed(2)}
Delivery: ${po.deliveryMethod === "in_store_delivery" ? "Delivery to our address" : "Pickup from supplier"}
${po.notes ? `\nNotes: ${po.notes}` : ""}

Download the PDF here:
${po.pdfUrl}

Kind regards,
${orgName}
  `.trim();

  await sendPOEmail({
    to: supplier.poEmail,
    subject,
    html,
    text,
    orgName,
    orgEmail,
    orgSettings,
  });

  // Mark PO as sent
  await db.updatePurchaseOrder(poId, organizationId, { status: "sent" });
}

/**
 * Email a quote PDF to the customer.
 * Uses the same SMTP/Resend logic as PO emails.
 */
export async function sendQuoteEmail(
  quoteId: number,
  organizationId: number
): Promise<void> {
  const quote = await db.getQuoteById(quoteId, organizationId);
  if (!quote) throw new Error("Quote not found");
  if (!quote.pdfUrl) throw new Error("Quote PDF must be generated before emailing");

  const customer = await db.getCustomerById(quote.customerId, organizationId);
  if (!customer) throw new Error("Customer not found");
  if (!customer.email) throw new Error("Customer does not have an email address");

  const orgSettings = await db.getCompanySettings(organizationId);
  const orgName = orgSettings?.companyName ?? "TradeFlow";
  const orgEmail = orgSettings?.email ?? null;

  const subject = `Quote ${quote.quoteNumber} from ${orgName}`;
  const contactName = customer.contactName || customer.companyName;

  const html = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1e40af;">Quote ${quote.quoteNumber}</h2>
        <p>Dear ${contactName},</p>
        <p>Please find our quote ${quote.quoteNumber} attached for your review.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background: #f3f4f6;">
            <td style="padding: 8px 12px; font-weight: 600;">Quote Number</td>
            <td style="padding: 8px 12px;">${quote.quoteNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: 600;">Date</td>
            <td style="padding: 8px 12px;">${new Date(quote.createdAt).toLocaleDateString("en-AU")}</td>
          </tr>
          <tr style="background: #f3f4f6;">
            <td style="padding: 8px 12px; font-weight: 600;">Total (inc GST)</td>
            <td style="padding: 8px 12px;">$${(parseFloat(quote.totalAmount || "0") * 1.1).toFixed(2)}</td>
          </tr>
          ${(quote as any).expiresAt ? `<tr>
            <td style="padding: 8px 12px; font-weight: 600;">Valid Until</td>
            <td style="padding: 8px 12px;">${new Date((quote as any).expiresAt).toLocaleDateString("en-AU")}</td>
          </tr>` : ""}
        </table>
        ${(quote as any).terms ? `<p><strong>Terms & Conditions:</strong><br>${(quote as any).terms}</p>` : ""}
        <div style="margin: 30px 0;">
          <a href="${quote.pdfUrl}" style="display: inline-block; padding: 12px 24px; background-color: #1e40af; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
            Download Quote PDF
          </a>
        </div>
        <p>If you have any questions, please don't hesitate to contact us.</p>
        <p>Kind regards,<br><strong>${orgName}</strong></p>
      </body>
    </html>
  `;

  const text = `
Quote ${quote.quoteNumber} from ${orgName}

Dear ${contactName},

Please find our quote ${quote.quoteNumber} attached for your review.

Quote Number: ${quote.quoteNumber}
Date: ${new Date(quote.createdAt).toLocaleDateString("en-AU")}
Total (inc GST): $${(parseFloat(quote.totalAmount || "0") * 1.1).toFixed(2)}
${(quote as any).expiresAt ? `Valid Until: ${new Date((quote as any).expiresAt).toLocaleDateString("en-AU")}` : ""}

Download the PDF here:
${quote.pdfUrl}

Kind regards,
${orgName}
  `.trim();

  // Reuse the org SMTP / Resend logic from PO emails
  const { smtpHost, smtpUser, smtpPassword, smtpFromEmail, smtpFromName, smtpPort, smtpSecure, companyName } = orgSettings ?? {};

  if (smtpHost && smtpUser && smtpPassword && smtpFromEmail) {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort ?? 587,
      secure: smtpSecure === 1,
      auth: { user: smtpUser, pass: smtpPassword },
    });
    await transporter.sendMail({
      from: `"${smtpFromName || companyName || orgName}" <${smtpFromEmail}>`,
      to: customer.email,
      subject,
      html,
      text,
    });
  } else {
    if (!ENV.resendApiKey) {
      console.warn("[Email] RESEND_API_KEY not set — logging quote email instead");
      console.log("[Email] To:", customer.email, "| Subject:", subject);
      return;
    }
    const resend = new Resend(ENV.resendApiKey);
    const { error } = await resend.emails.send({
      from: `${orgName} <${ENV.fromEmail}>`,
      to: customer.email,
      replyTo: orgEmail ?? ENV.fromEmail,
      subject,
      html,
      text,
    });
    if (error) throw new Error(`Failed to send email: ${error.message}`);
  }

  // Mark the quote as having been emailed (update sentAt)
  await db.updateQuote(quoteId, organizationId, { sentAt: new Date() } as any);
}

/**
 * Send a team invitation email.
 */
export async function sendInvitationEmail(params: {
  email: string;
  name: string;
  organizationName: string;
  inviterName: string;
}): Promise<void> {
  const registrationUrl = `${ENV.appUrl}/register?email=${encodeURIComponent(params.email)}`;

  const html = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1e40af;">You've been invited to TradeFlow!</h2>
        <p>Hi ${params.name},</p>
        <p><strong>${params.inviterName}</strong> has invited you to join <strong>${params.organizationName}</strong> on TradeFlow.</p>
        <p>TradeFlow is a professional quoting and purchase order management system designed for wholesale distribution.</p>
        <div style="margin: 30px 0;">
          <a href="${registrationUrl}" style="display: inline-block; padding: 12px 30px; background-color: #1e40af; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
            Create Your Account
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">Or copy and paste this link: <a href="${registrationUrl}">${registrationUrl}</a></p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">If you didn't expect this invitation, you can safely ignore this email.</p>
      </body>
    </html>
  `;

  const text = `
You've been invited to TradeFlow!

Hi ${params.name},

${params.inviterName} has invited you to join ${params.organizationName} on TradeFlow.

Create your account here:
${registrationUrl}

If you didn't expect this invitation, you can safely ignore this email.
  `.trim();

  await sendSystemEmail({
    to: params.email,
    subject: `You've been invited to join ${params.organizationName} on TradeFlow`,
    html,
    text,
  });
}

/**
 * Send a password reset email.
 */
export async function sendPasswordResetEmail(params: {
  email: string;
  token: string;
}): Promise<void> {
  const resetUrl = `${ENV.appUrl}/reset-password?token=${params.token}`;

  const html = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1e40af;">Reset Your Password</h2>
        <p>We received a request to reset the password for your TradeFlow account.</p>
        <p>Click the button below to reset it. This link expires in <strong>1 hour</strong>.</p>
        <div style="margin: 30px 0;">
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 30px; background-color: #1e40af; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">Or copy and paste this link: <a href="${resetUrl}">${resetUrl}</a></p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">If you didn't request a password reset, you can safely ignore this email. Your password will not change.</p>
      </body>
    </html>
  `;

  const text = `
Reset Your Password

We received a request to reset the password for your TradeFlow account.

Click the link below to reset it (expires in 1 hour):
${resetUrl}

If you didn't request a password reset, you can safely ignore this email.
  `.trim();

  await sendSystemEmail({
    to: params.email,
    subject: "Reset your TradeFlow password",
    html,
    text,
  });
}
