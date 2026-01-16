import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "./_core/trpc";

/**
 * Middleware that ensures the user has an organizationId
 * All business operations should use this instead of protectedProcedure directly
 */
export const orgProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "User must belong to an organization to perform this action",
    });
  }
  
  return next({
    ctx: {
      ...ctx,
      organizationId: ctx.organizationId, // TypeScript now knows this is non-null
    },
  });
});
