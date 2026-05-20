import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { handleStripeWebhook } from "../stripeWebhook";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

// ---------------------------------------------------------------------------
// Rate limiters
// ---------------------------------------------------------------------------

/** Auth endpoints: login, register, forgot-password — strict */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
  skip: () => process.env.NODE_ENV === "test",
});

/** Password reset and impersonation attempts — very strict */
const sensitiveActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
  skip: () => process.env.NODE_ENV === "test",
});

/** General tRPC API — generous but prevents runaway scripts */
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 min
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
  skip: () => process.env.NODE_ENV === "test",
});

async function startServer() {
  const app = express();
  const server = createServer(app);
  const isProd = process.env.NODE_ENV === "production";

  // Trust the nginx reverse proxy so Express sees the real client IP
  app.set("trust proxy", 1);

  // ---------------------------------------------------------------------------
  // Security headers via helmet
  // ---------------------------------------------------------------------------
  app.use(
    helmet({
      contentSecurityPolicy: isProd
        ? {
            directives: {
              defaultSrc: ["'self'"],
              // 'unsafe-inline' + 'unsafe-eval' needed for Vite-built bundles (inline module preload)
              scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://js.stripe.com"],
              styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
              fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
              imgSrc: ["'self'", "data:", "https:", "blob:"],
              connectSrc: ["'self'", "https://api.stripe.com"],
              frameSrc: ["https://js.stripe.com", "https://hooks.stripe.com"],
              objectSrc: ["'none'"],
              upgradeInsecureRequests: [],
            },
          }
        : false, // disable in dev so Vite HMR works
      crossOriginEmbedderPolicy: false, // breaks S3 presigned URL images in some browsers
    })
  );

  // ---------------------------------------------------------------------------
  // CORS — only accept requests from our own origin in production
  // ---------------------------------------------------------------------------
  const allowedOrigins = isProd
    ? [process.env.APP_URL ?? "https://tradeflow.devedge.com.au"]
    : true; // allow all in dev

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    })
  );

  // ---------------------------------------------------------------------------
  // Stripe webhook MUST use raw body — register BEFORE json middleware
  // ---------------------------------------------------------------------------
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    handleStripeWebhook
  );

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // ---------------------------------------------------------------------------
  // Apply rate limiters to specific tRPC procedure paths
  // Auth procedures (login, register, forgot-password, reset-password)
  // ---------------------------------------------------------------------------
  app.use("/api/trpc/auth.login", authLimiter);
  app.use("/api/trpc/auth.register", authLimiter);
  app.use("/api/trpc/auth.forgotPassword", sensitiveActionLimiter);
  app.use("/api/trpc/auth.resetPassword", sensitiveActionLimiter);
  app.use("/api/trpc/billing.startTrial", authLimiter);
  app.use("/api/trpc/superAdmin.startImpersonation", sensitiveActionLimiter);

  // General API rate limit (applied after specific ones so specific limits win)
  app.use("/api/trpc", apiLimiter);

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
