// ---------------------------------------------------------------------------
// Critical env vars — the server refuses to start if any are missing.
// This prevents running in a broken/insecure state with empty secrets.
// ---------------------------------------------------------------------------
const REQUIRED_VARS = [
  "JWT_SECRET",
  "DATABASE_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_S3_BUCKET",
  "RESEND_API_KEY",
] as const;

const missing = REQUIRED_VARS.filter(v => !process.env[v]);
if (missing.length > 0) {
  console.error(
    `[FATAL] Missing required environment variables:\n  ${missing.join("\n  ")}\nServer cannot start.`
  );
  process.exit(1);
}

// JWT_SECRET must be long enough to be meaningful (at least 32 chars)
const jwtSecret = process.env.JWT_SECRET!;
if (jwtSecret.length < 32) {
  console.error("[FATAL] JWT_SECRET must be at least 32 characters long.");
  process.exit(1);
}

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: jwtSecret,
  databaseUrl: process.env.DATABASE_URL!,
  isProduction: process.env.NODE_ENV === "production",
  // App URL (used in emails)
  appUrl: process.env.APP_URL ?? "https://tradeflow.devedge.com.au",
  // AWS S3 for file storage (logos, PDFs)
  s3BucketName: process.env.AWS_S3_BUCKET!,
  s3Region: process.env.AWS_S3_REGION ?? "ap-southeast-2",
  s3AccessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  s3SecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  // Resend (system emails — password reset, invitations)
  resendApiKey: process.env.RESEND_API_KEY!,
  fromEmail: process.env.FROM_EMAIL ?? "noreply@devedge.com.au",
  // Stripe — base plans
  stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  stripeMonthlyPriceId: process.env.STRIPE_MONTHLY_PRICE_ID ?? "",
  stripeAnnualPriceId: process.env.STRIPE_ANNUAL_PRICE_ID ?? "",
  // Stripe — seat add-ons (per unit, quantity = number of extra seats)
  stripeSeatMonthlyPriceId: process.env.STRIPE_SEAT_MONTHLY_PRICE_ID ?? "",
  stripeSeatAnnualPriceId: process.env.STRIPE_SEAT_ANNUAL_PRICE_ID ?? "",
  // Stripe — 4-seat packs
  stripe4PackMonthlyPriceId: process.env.STRIPE_4PACK_MONTHLY_PRICE_ID ?? "",
  stripe4PackAnnualPriceId: process.env.STRIPE_4PACK_ANNUAL_PRICE_ID ?? "",
  // Stripe — 9-seat packs
  stripe9PackMonthlyPriceId: process.env.STRIPE_9PACK_MONTHLY_PRICE_ID ?? "",
  stripe9PackAnnualPriceId: process.env.STRIPE_9PACK_ANNUAL_PRICE_ID ?? "",
  // Legacy Manus vars (unused — kept so _core files compile cleanly)
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
