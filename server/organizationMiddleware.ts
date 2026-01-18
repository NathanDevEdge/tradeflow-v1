import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { organizations } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Middleware that ensures the user has an organizationId and active subscription
 * All business operations should use this instead of protectedProcedure directly
 */
export const orgProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "User must belong to an organization to perform this action",
    });
  }
  
  // Check organization subscription status
  const db = await getDb();
  if (!db) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database not available",
    });
  }
  
  const org = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, ctx.organizationId))
    .limit(1);
  
  if (org.length === 0) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Organization not found",
    });
  }
  
  const organization = org[0];
  
  // Check subscription status
  if (organization.subscriptionStatus === "expired" || organization.subscriptionStatus === "cancelled") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Organization subscription is not active. Please renew your subscription.",
    });
  }
  
  // Check subscription end date for non-indefinite subscriptions
  if (organization.subscriptionType !== "indefinite" && organization.subscriptionEndDate) {
    const now = new Date();
    const endDate = new Date(organization.subscriptionEndDate);
    
    if (endDate < now) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Organization subscription has expired. Please renew your subscription.",
      });
    }
  }
  
  return next({
    ctx: {
      ...ctx,
      organizationId: ctx.organizationId, // TypeScript now knows this is non-null
      organization, // Pass organization data to procedures
    },
  });
});

/**
 * Middleware for org owners - includes subscription checks
 */
export const orgOwnerProcedure = orgProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "org_owner" && ctx.user.role !== "super_admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only organization owners can perform this action",
    });
  }
  
  return next({ ctx });
});

/**
 * Middleware for super admins - bypasses subscription checks
 */
export const superAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "super_admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only super administrators can perform this action",
    });
  }
  
  return next({ ctx });
});
