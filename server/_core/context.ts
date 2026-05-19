import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { jwtVerify } from "jose";
import cookie from "cookie";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  organizationId: number | null;
  isImpersonating: boolean;
  impersonatedBy: number | null;
};

async function verifySessionToken(token: string): Promise<{ userId: number; extra?: Record<string, unknown> } | null> {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
    const { payload } = await jwtVerify(token, secret);
    if (!payload.userId) return null;
    return { userId: payload.userId as number, extra: payload as Record<string, unknown> };
  } catch {
    return null;
  }
}

async function getUserById(id: number): Promise<User | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (result.length === 0 || result[0].status !== "active") return null;
  return result[0];
}

async function authenticateCustomToken(req: CreateExpressContextOptions["req"]): Promise<User | null> {
  try {
    const cookies = cookie.parse(req.headers.cookie || "");
    const token = cookies.manus_session;
    if (!token) return null;
    const parsed = await verifySessionToken(token);
    if (!parsed) return null;
    return getUserById(parsed.userId);
  } catch (error) {
    return null;
  }
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  // --- Check for impersonation session first ---
  const cookies = cookie.parse(opts.req.headers.cookie || "");
  const impersonationToken = cookies.impersonation_session;
  if (impersonationToken) {
    try {
      const parsed = await verifySessionToken(impersonationToken);
      if (parsed && (parsed.extra?.impersonating as boolean)) {
        const impUser = await getUserById(parsed.userId);
        if (impUser) {
          return {
            req: opts.req,
            res: opts.res,
            user: impUser,
            organizationId: impUser.organizationId || null,
            isImpersonating: true,
            impersonatedBy: (parsed.extra?.impersonatedBy as number) ?? null,
          };
        }
      }
    } catch {
      // fall through to normal auth
    }
  }

  let user: User | null = null;

  // Try custom auth first (email/password)
  user = await authenticateCustomToken(opts.req);

  // Fall back to OAuth if custom auth fails
  if (!user) {
    try {
      const oauthUser = await sdk.authenticateRequest(opts.req);

      if (oauthUser && oauthUser.openId) {
        // Fetch full user record from database to get role and other fields
        const db = await getDb();
        if (db) {
          const result = await db
            .select()
            .from(users)
            .where(eq(users.openId, oauthUser.openId as string))
            .limit(1);

          if (result.length > 0) {
            user = result[0];
          } else {
            // OAuth user exists but not in our database yet
            user = oauthUser;
          }
        } else {
          user = oauthUser;
        }
      }
    } catch (error) {
      // Authentication is optional for public procedures.
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    organizationId: user?.organizationId || null,
    isImpersonating: false,
    impersonatedBy: null,
  };
}
