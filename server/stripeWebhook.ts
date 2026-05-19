import type { Request, Response } from "express";
import Stripe from "stripe";
import { getStripe, STRIPE_WEBHOOK_SECRET } from "./stripe";
import { getDb } from "./db";
import { organizations, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import * as customAuth from "./customAuth";
import { sendSystemEmail } from "./email";
import { ENV } from "./_core/env";

export async function handleStripeWebhook(req: Request, res: Response): Promise<void> {
  const sig = req.headers["stripe-signature"];

  if (!sig || !STRIPE_WEBHOOK_SECRET) {
    console.warn("[Stripe Webhook] Missing signature or webhook secret — skipping verification");
    res.status(400).json({ error: "Missing stripe-signature header or webhook secret" });
    return;
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error("[Stripe Webhook] Signature verification failed:", err.message);
    res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
    return;
  }

  console.log(`[Stripe Webhook] Received event: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error("[Stripe Webhook] Handler error:", err);
    res.status(500).json({ error: "Webhook handler failed" });
  }
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const meta = session.metadata ?? {};
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  if (meta.flow === "new_signup") {
    // --- New customer paying upfront: create org + user ---
    const { email, companyName, ownerName, plan, seats } = meta;
    if (!email || !companyName || !ownerName) {
      console.error("[Stripe Webhook] Missing metadata for new_signup:", meta);
      return;
    }

    // Check if account already exists
    const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    if (existing.length > 0) {
      console.log(`[Stripe Webhook] User already exists for ${email} — skipping org creation`);
      return;
    }

    const subscriptionType = plan === "annual" ? "annual" : "monthly";
    const userLimit = seats ? Math.max(1, parseInt(seats, 10)) : 1;
    const endDate = new Date();
    if (subscriptionType === "annual") {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // Create org as active (paid)
    const supportCode = String(Math.floor(100000 + Math.random() * 900000));
    const [orgResult] = await db.insert(organizations).values({
      name: companyName,
      subscriptionType,
      subscriptionStatus: "active",
      subscriptionEndDate: endDate,
      userLimit,
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: session.subscription as string,
      supportCode,
    });
    const orgId = Number(orgResult.insertId);

    // Generate a temporary password and create user directly
    const tempPassword = Math.random().toString(36).slice(-10) + "A1!";
    const passwordHash = await customAuth.hashPassword(tempPassword);
    await db.insert(users).values({
      email: email.toLowerCase(),
      passwordHash,
      name: ownerName,
      loginMethod: "email",
      role: "org_owner",
      status: "active",
      organizationId: orgId,
    });

    // Send welcome email with credentials
    const html = `
      <html><body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a5c5a;">Welcome to TradeFlow!</h2>
        <p>Hi ${ownerName},</p>
        <p>Your payment was successful and your TradeFlow account is ready. Here are your login details:</p>
        <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 4px 0;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 4px 0;"><strong>Temporary password:</strong> <code>${tempPassword}</code></p>
        </div>
        <p style="margin: 24px 0;">
          <a href="${ENV.appUrl}/login" style="background: #2aacaa; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
            Log in to TradeFlow
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">Please change your password after logging in from the Settings page.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">TradeFlow by DevEdge · <a href="${ENV.appUrl}">tradeflow.devedge.com.au</a></p>
      </body></html>
    `;

    await sendSystemEmail({
      to: email,
      subject: "Your TradeFlow account is ready — login details inside",
      html,
      text: `Welcome to TradeFlow! Email: ${email} | Temporary password: ${tempPassword} | Login at ${ENV.appUrl}/login`,
    });

    console.log(`[Stripe Webhook] Created new org "${companyName}" and user ${email}`);

  } else if (meta.flow === "upgrade") {
    // --- Existing org upgrading from trial to paid ---
    const { organizationId, plan, seats } = meta;
    if (!organizationId) {
      console.error("[Stripe Webhook] Missing organizationId for upgrade:", meta);
      return;
    }

    const subscriptionType = plan === "annual" ? "annual" : "monthly";
    const userLimit = seats ? Math.max(1, parseInt(seats, 10)) : 1;
    const endDate = new Date();
    if (subscriptionType === "annual") {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    await db.update(organizations)
      .set({
        subscriptionStatus: "active",
        subscriptionType,
        subscriptionEndDate: endDate,
        userLimit,
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: session.subscription as string,
      })
      .where(eq(organizations.id, Number(organizationId)));

    console.log(`[Stripe Webhook] Upgraded org ${organizationId} to ${subscriptionType}`);
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  // Only handle subscription renewal invoices (not the first payment — that's handled in checkout.session.completed)
  const subscriptionId = (invoice as any).subscription as string | null;
  if (!invoice.billing_reason?.includes("subscription_cycle") || !subscriptionId) return;

  const db = await getDb();
  if (!db) return;

  // Find org by stripeSubscriptionId
  const org = await db.select().from(organizations).where(eq(organizations.stripeSubscriptionId, subscriptionId)).limit(1);
  if (!org.length) {
    console.warn(`[Stripe Webhook] No org found for subscription ${subscriptionId}`);
    return;
  }

  const o = org[0];
  const endDate = new Date();
  if (o.subscriptionType === "annual") {
    endDate.setFullYear(endDate.getFullYear() + 1);
  } else {
    endDate.setMonth(endDate.getMonth() + 1);
  }

  await db.update(organizations)
    .set({ subscriptionStatus: "active", subscriptionEndDate: endDate })
    .where(eq(organizations.id, o.id));

  console.log(`[Stripe Webhook] Renewed subscription for org ${o.id} until ${endDate.toISOString()}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const db = await getDb();
  if (!db) return;

  const org = await db.select().from(organizations).where(eq(organizations.stripeSubscriptionId, subscription.id)).limit(1);
  if (!org.length) {
    console.warn(`[Stripe Webhook] No org found for subscription ${subscription.id}`);
    return;
  }

  await db.update(organizations)
    .set({ subscriptionStatus: "cancelled" })
    .where(eq(organizations.id, org[0].id));

  console.log(`[Stripe Webhook] Cancelled org ${org[0].id}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const db = await getDb();
  if (!db) return;

  const org = await db.select().from(organizations).where(eq(organizations.stripeSubscriptionId, subscription.id)).limit(1);
  if (!org.length) {
    console.warn(`[Stripe Webhook] No org found for subscription ${subscription.id}`);
    return;
  }

  // Map Stripe subscription status to our status
  // "active" and "trialing" → active; "past_due" / "unpaid" → expired; others leave unchanged
  let newStatus: "active" | "expired" | "cancelled" | "trial" | undefined;
  if (subscription.status === "active") {
    newStatus = "active";
  } else if (subscription.status === "past_due" || subscription.status === "unpaid") {
    newStatus = "expired";
  } else if (subscription.status === "canceled") {
    newStatus = "cancelled";
  }

  if (newStatus) {
    await db.update(organizations)
      .set({ subscriptionStatus: newStatus })
      .where(eq(organizations.id, org[0].id));

    console.log(`[Stripe Webhook] Updated org ${org[0].id} status → ${newStatus} (Stripe: ${subscription.status})`);
  } else {
    console.log(`[Stripe Webhook] Subscription updated for org ${org[0].id} — Stripe status "${subscription.status}" (no action)`);
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice as any).subscription as string | null;
  if (!subscriptionId) return;

  const db = await getDb();
  if (!db) return;

  const org = await db.select().from(organizations).where(eq(organizations.stripeSubscriptionId, subscriptionId)).limit(1);
  if (!org.length) {
    console.warn(`[Stripe Webhook] No org found for subscription ${subscriptionId} (payment failed)`);
    return;
  }

  const o = org[0];

  // Find the org owner to notify
  const ownerRows = await db.select().from(users)
    .where(eq(users.organizationId, o.id))
    .limit(10);

  const owner = ownerRows.find((u) => u.role === "org_owner") ?? ownerRows[0];

  if (owner?.email) {
    const html = `
      <html><body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #dc2626;">Payment failed</h2>
        <p>Hi${owner.name ? ` ${owner.name}` : ""},</p>
        <p>We weren't able to process the payment for your TradeFlow subscription. Your account remains active while Stripe retries the payment, but please update your billing details to avoid any interruption.</p>
        <p style="margin: 24px 0;">
          <a href="${ENV.appUrl}/settings?billing=1" style="background: #2aacaa; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
            Update billing details
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">If you have any questions, reply to this email and we'll help you out.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">TradeFlow by DevEdge · <a href="${ENV.appUrl}">tradeflow.devedge.com.au</a></p>
      </body></html>
    `;

    await sendSystemEmail({
      to: owner.email,
      subject: "Action required: TradeFlow payment failed",
      html,
      text: `Hi${owner.name ? ` ${owner.name}` : ""}, we couldn't process your TradeFlow payment. Please update your billing details at ${ENV.appUrl}/settings?billing=1`,
    });

    console.log(`[Stripe Webhook] Payment failed for org ${o.id} — notified ${owner.email}`);
  } else {
    console.warn(`[Stripe Webhook] Payment failed for org ${o.id} — no owner email found`);
  }
}
