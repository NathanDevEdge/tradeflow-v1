import Stripe from "stripe";
import { ENV } from "./_core/env";

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  return new Stripe(key, { apiVersion: "2025-04-30.basil" });
}

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";

// ---------------------------------------------------------------------------
// Seat pack definitions — used on both server and surfaced to the client
// via tRPC so the subscribe page can show correct pricing.
// ---------------------------------------------------------------------------

export type Plan = "monthly" | "annual";

export type SeatOption =
  | { type: "none" }                    // just the 1 included seat
  | { type: "pack4" }                   // +4 seats pack
  | { type: "pack9" }                   // +9 seats pack
  | { type: "custom"; extra: number };  // individual seats × N

/** How many seats a SeatOption adds on top of the base 1 seat */
export function seatOptionCount(opt: SeatOption): number {
  if (opt.type === "none") return 0;
  if (opt.type === "pack4") return 4;
  if (opt.type === "pack9") return 9;
  return opt.extra;
}

/** Total seats (including the 1 base seat) */
export function totalSeats(opt: SeatOption): number {
  return 1 + seatOptionCount(opt);
}

/** Additional monthly cost for the seat option (AUD) */
export function seatOptionPrice(opt: SeatOption, plan: Plan): number {
  const monthly = (() => {
    if (opt.type === "none") return 0;
    if (opt.type === "pack4") return 15;
    if (opt.type === "pack9") return 30;
    return opt.extra * 5;
  })();
  // Annual = monthly × 10 (saves ~17% same as base)
  return plan === "annual" ? monthly * 10 : monthly;
}

function getPriceIds(plan: Plan) {
  return {
    base: plan === "annual" ? ENV.stripeAnnualPriceId : ENV.stripeMonthlyPriceId,
    seatUnit: plan === "annual" ? ENV.stripeSeatAnnualPriceId : ENV.stripeSeatMonthlyPriceId,
    pack4: plan === "annual" ? ENV.stripe4PackAnnualPriceId : ENV.stripe4PackMonthlyPriceId,
    pack9: plan === "annual" ? ENV.stripe9PackAnnualPriceId : ENV.stripe9PackMonthlyPriceId,
  };
}

function buildLineItems(plan: Plan, seatOption: SeatOption): Stripe.Checkout.SessionCreateParams.LineItem[] {
  const prices = getPriceIds(plan);
  const items: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    { price: prices.base, quantity: 1 },
  ];

  if (seatOption.type === "pack4" && prices.pack4) {
    items.push({ price: prices.pack4, quantity: 1 });
  } else if (seatOption.type === "pack9" && prices.pack9) {
    items.push({ price: prices.pack9, quantity: 1 });
  } else if (seatOption.type === "custom" && seatOption.extra > 0 && prices.seatUnit) {
    items.push({ price: prices.seatUnit, quantity: seatOption.extra });
  }

  return items;
}

// ---------------------------------------------------------------------------
// Checkout sessions
// ---------------------------------------------------------------------------

/**
 * Create a Stripe Checkout session for a new signup paying upfront.
 */
export async function createNewSignupCheckoutSession(params: {
  plan: Plan;
  seatOption: SeatOption;
  email: string;
  companyName: string;
  ownerName: string;
}): Promise<string> {
  const stripe = getStripe();
  const lineItems = buildLineItems(params.plan, params.seatOption);
  const seats = totalSeats(params.seatOption);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: params.email,
    line_items: lineItems,
    metadata: {
      flow: "new_signup",
      email: params.email,
      companyName: params.companyName,
      ownerName: params.ownerName,
      plan: params.plan,
      seats: String(seats),
    },
    subscription_data: {
      metadata: {
        email: params.email,
        companyName: params.companyName,
        ownerName: params.ownerName,
        plan: params.plan,
        seats: String(seats),
      },
    },
    success_url: `${ENV.appUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${ENV.appUrl}/?cancelled=1`,
    allow_promotion_codes: true,
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return session.url;
}

/**
 * Create a Stripe Checkout session for an existing org upgrading from trial.
 */
export async function createUpgradeCheckoutSession(params: {
  plan: Plan;
  seatOption: SeatOption;
  email: string;
  companyName: string;
  organizationId: number;
  stripeCustomerId?: string | null;
}): Promise<string> {
  const stripe = getStripe();
  const lineItems = buildLineItems(params.plan, params.seatOption);
  const seats = totalSeats(params.seatOption);

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: lineItems,
    metadata: {
      flow: "upgrade",
      organizationId: String(params.organizationId),
      plan: params.plan,
      seats: String(seats),
    },
    subscription_data: {
      metadata: {
        organizationId: String(params.organizationId),
        plan: params.plan,
        seats: String(seats),
      },
    },
    success_url: `${ENV.appUrl}/dashboard?upgraded=1`,
    cancel_url: `${ENV.appUrl}/settings?billing=1`,
    allow_promotion_codes: true,
  };

  if (params.stripeCustomerId) {
    sessionParams.customer = params.stripeCustomerId;
  } else {
    sessionParams.customer_email = params.email;
  }

  const session = await stripe.checkout.sessions.create(sessionParams);
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return session.url;
}

/**
 * Create a Stripe Customer Portal session.
 */
export async function createPortalSession(params: {
  stripeCustomerId: string;
  returnUrl?: string;
}): Promise<string> {
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: params.stripeCustomerId,
    return_url: params.returnUrl ?? `${ENV.appUrl}/settings?billing=1`,
  });
  return session.url;
}
