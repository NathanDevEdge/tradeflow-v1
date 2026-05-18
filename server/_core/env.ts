export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // App URL (used in emails)
  appUrl: process.env.APP_URL ?? "https://tradeflow.devedge.com.au",
  // AWS S3 for file storage (logos, PDFs)
  s3BucketName: process.env.AWS_S3_BUCKET ?? "",
  s3Region: process.env.AWS_S3_REGION ?? "ap-southeast-2",
  s3AccessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
  s3SecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  // Resend (system emails — password reset, invitations)
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  fromEmail: process.env.FROM_EMAIL ?? "noreply@devedge.com.au",
  // Legacy Manus vars (unused — kept so _core files compile cleanly)
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
