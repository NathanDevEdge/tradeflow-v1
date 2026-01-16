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
};

async function authenticateCustomToken(req: CreateExpressContextOptions["req"]): Promise<User | null> {
  try {
    const cookies = cookie.parse(req.headers.cookie || "");
    const token = cookies.manus_session;
    
    if (!token) return null;

    // Verify JWT token
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
    const { payload } = await jwtVerify(token, secret);

    if (!payload.userId) return null;

    // Get user from database
    const db = await getDb();
    if (!db) return null;

    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId as number))
      .limit(1);

    if (result.length === 0) return null;

    const user = result[0];
    
    // Check if user is active
    if (user.status !== "active") return null;

    return user;
  } catch (error) {
    return null;
  }
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
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
  };
}
