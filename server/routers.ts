import { COOKIE_NAME } from "@shared/const";
import { contactInquiries } from "../drizzle/schema";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { notifyOwner } from "./_core/notification";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { orgProcedure } from "./organizationMiddleware";
import { z } from "zod";
import * as dbHelpers from "./db";
import { getDb } from "./db";
import { users, organizations } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { generateQuotePDF, generatePurchaseOrderPDF } from "./pdfgen"; // v2.0 PDF fixes - RENAMED MODULE
import { sendPurchaseOrderEmail, sendQuoteEmail } from "./email";
import * as customAuth from "./customAuth";
import * as admin from "./admin";
import { SignJWT } from "jose";
import { sendSystemEmail } from "./email";
import { ENV } from "./_core/env";
import {
  createNewSignupCheckoutSession,
  createUpgradeCheckoutSession,
  createPortalSession,
  type SeatOption,
} from "./stripe";
import { orgOwnerProcedure } from "./organizationMiddleware";

// CSV column name normalization - handles case-insensitive and flexible naming
function normalizeColumnName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

function normalizeCSVRow(row: Record<string, string>): Record<string, string> {
  const normalized: Record<string, string> = {};
  const columnMap: Record<string, string> = {
    "item name": "Item Name",
    "sku code": "SKU Code",
    "pack size": "Pack Size",
    "pack buy price": "Pack buy price ex gst",
    "pack buy price ex gst": "Pack buy price ex gst",
    "loose buy price": "Loose buy price ex gst",
    "loose buy price ex gst": "Loose buy price ex gst",
    "rrp ex gst": "RRP ex gst",
    "rrp inc gst": "RRP inc gst",
  };

  Object.entries(row).forEach(([key, value]) => {
    const normalizedKey = normalizeColumnName(key);
    const mappedKey = columnMap[normalizedKey];
    if (mappedKey) {
      normalized[mappedKey] = value;
    }
  });

  return normalized;
}

// CSV validation schema
const csvRowSchema = z.object({
  "Item Name": z.string().min(1, "Item Name is required"),
  "SKU Code": z.string().optional(),
  "Pack Size": z.string().optional(),
  "Pack buy price ex gst": z.string().optional(),
  "Loose buy price ex gst": z.string().min(1, "Loose buy price ex gst is required"),
  "RRP ex gst": z.string().min(1, "RRP ex gst is required"),
  "RRP inc gst": z.string().optional(),
});

function parseDecimal(value: string | undefined): string | undefined {
  if (!value || value.trim() === "") return undefined;
  const parsed = parseFloat(value.replace(/[^0-9.-]/g, ""));
  return isNaN(parsed) ? undefined : parsed.toFixed(2);
}

// Removed old adminProcedure - now using superAdminProcedure from organizationMiddleware

const superAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "super_admin") {
    throw new Error("Super admin access required");
  }
  return next({ ctx });
});

const orgOwnerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "org_owner" && ctx.user.role !== "super_admin") {
    throw new Error("Organization owner access required");
  }
  if (!ctx.user.organizationId) {
    throw new Error("User must belong to an organization");
  }
  return next({ ctx: { ...ctx, organizationId: ctx.user.organizationId } });
});

export const appRouter = router({
  // Removed old admin router - subscriptions now managed at organization level in Super Admin panel

  profile: router({
    changePassword: protectedProcedure
      .input(z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(8, "Password must be at least 8 characters"),
      }))
      .mutation(async ({ input, ctx }) => {
        // Verify current password
        const user = await dbHelpers.getUserByEmail(ctx.user.email);
        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot change password for OAuth users" });
        }

        const isValid = await customAuth.verifyPassword(input.currentPassword, user.passwordHash);
        if (!isValid) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Current password is incorrect" });
        }

        // Hash and update new password
        const newPasswordHash = await customAuth.hashPassword(input.newPassword);
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

        await db.update(users)
          .set({ passwordHash: newPasswordHash })
          .where(eq(users.id, ctx.user.id));

        return { success: true };
      }),
  }),

  customAuth: router({
    register: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().optional(),
        invitationToken: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await customAuth.registerUser(
          input.email,
          input.password,
          input.name,
          input.invitationToken
        );
        return { success: true };
      }),
    
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const user = await customAuth.authenticateUser(input.email, input.password);
        
        // Create session token using the same method as OAuth
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
        const token = await new SignJWT({ userId: user.id, email: user.email })
          .setProtectedHeader({ alg: "HS256" })
          .setExpirationTime("7d")
          .sign(secret);
        
        // Set cookie
        const cookieOptions = {
          httpOnly: true,
          secure: ctx.req.protocol === "https",
          sameSite: ctx.req.protocol === "https" ? "none" as const : "lax" as const,
          path: "/",
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        };
        ctx.res.cookie("manus_session", token, cookieOptions);
        
        return { success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
      }),
    
    requestPasswordReset: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input, ctx }) => {
        try {
          const token = await customAuth.createPasswordResetToken(input.email);
          const { sendPasswordResetEmail } = await import("./email");
          await sendPasswordResetEmail({ email: input.email, token });
          return { success: true };
        } catch (error: any) {
          // Don't reveal if email exists
          return { success: true };
        }
      }),
    
    resetPassword: publicProcedure
      .input(z.object({
        token: z.string(),
        newPassword: z.string().min(8),
      }))
      .mutation(async ({ input, ctx }) => {
        await customAuth.resetPassword(input.token, input.newPassword);
        return { success: true };
      }),
    
    changePassword: protectedProcedure
      .input(z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(8),
      }))
      .mutation(async ({ input, ctx }) => {
        await customAuth.changePassword(ctx.user.id, input.currentPassword, input.newPassword);
        return { success: true };
      }),
  }),
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => {
      if (!opts.ctx.user) return null;
      return {
        ...opts.ctx.user,
        isImpersonating: opts.ctx.isImpersonating,
        impersonatedBy: opts.ctx.impersonatedBy,
      };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      
      // Clear OAuth cookie
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      
      // Clear custom auth cookie
      ctx.res.clearCookie("manus_session", { ...cookieOptions, maxAge: -1 });
      
      return {
        success: true,
      } as const;
    }),
  }),

  pricelists: router({
    list: orgProcedure.query(async ({ ctx }) => {
      return await dbHelpers.getAllPricelists(ctx.organizationId);
    }),
    
    get: orgProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        return await dbHelpers.getPricelistById(input.id, ctx.organizationId);
      }),
    
    create: orgProcedure
      .input(z.object({ name: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        return await dbHelpers.createPricelist(input.name, ctx.organizationId);
      }),
    
    update: orgProcedure
      .input(z.object({ id: z.number(), name: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        await dbHelpers.updatePricelist(input.id, ctx.organizationId, input.name);
        return { success: true };
      }),
    
    delete: orgProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await dbHelpers.deletePricelist(input.id, ctx.organizationId);
        return { success: true };
      }),
    
    bulkCreateItems: orgProcedure
      .input(z.object({
        items: z.array(z.object({
          pricelistId: z.number(),
          itemName: z.string(),
          skuCode: z.string().nullable().optional(),
          packSize: z.string().nullable().optional(),
          packBuyPrice: z.number().nullable().optional(),
          looseBuyPrice: z.number(),
          rrpExGst: z.number(),
          rrpIncGst: z.number().nullable().optional(),
          sellPrice: z.number().optional(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        const itemsToInsert = input.items.map(item => ({
          organizationId: ctx.organizationId,
          pricelistId: item.pricelistId,
          itemName: item.itemName,
          skuCode: item.skuCode || null,
          packSize: item.packSize || null,
          packBuyPrice: item.packBuyPrice?.toString() || null,
          looseBuyPrice: item.looseBuyPrice.toString(),
          rrpExGst: item.rrpExGst.toString(),
          rrpIncGst: item.rrpIncGst?.toString() || null,
          sellPrice: item.sellPrice?.toString() || item.rrpExGst.toString(),
        }));
        
        await dbHelpers.bulkCreatePricelistItems(itemsToInsert);
        return { count: itemsToInsert.length };
      }),
  }),

  pricelistItems: router({
    list: orgProcedure
      .input(z.object({ pricelistId: z.number() }))
      .query(async ({ input, ctx }) => {
        return await dbHelpers.getPricelistItems(input.pricelistId, ctx.organizationId);
      }),
    
    listAll: orgProcedure
      .query(async ({ ctx }) => {
        return await dbHelpers.getAllPricelistItems(ctx.organizationId);
      }),
    
    get: orgProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        return await dbHelpers.getPricelistItemById(input.id, ctx.organizationId);
      }),
    
    uploadCSV: orgProcedure
      .input(z.object({
        pricelistId: z.number(),
        csvData: z.array(z.record(z.string(), z.string())),
      }))
      .mutation(async ({ input, ctx }) => {
        const errors: string[] = [];
        const validItems: Array<Parameters<typeof dbHelpers.createPricelistItem>[0]> = [];

        input.csvData.forEach((row, index) => {
          try {
            const normalizedRow = normalizeCSVRow(row);
            const validated = csvRowSchema.parse(normalizedRow);
            
            const looseBuyPrice = parseDecimal(validated["Loose buy price ex gst"]);
            const rrpExGst = parseDecimal(validated["RRP ex gst"]);
            
            if (!looseBuyPrice) {
              errors.push(`Row ${index + 1}: Invalid Loose buy price ex gst`);
              return;
            }
            if (!rrpExGst) {
              errors.push(`Row ${index + 1}: Invalid RRP ex gst`);
              return;
            }

            validItems.push({
              organizationId: ctx.organizationId,
              pricelistId: input.pricelistId,
              itemName: validated["Item Name"],
              skuCode: validated["SKU Code"] || null,
              packSize: validated["Pack Size"] || null,
              packBuyPrice: parseDecimal(validated["Pack buy price ex gst"]) || null,
              looseBuyPrice,
              rrpExGst,
              rrpIncGst: parseDecimal(validated["RRP inc gst"]) || null,
              sellPrice: rrpExGst, // Default sell price to RRP ex GST
            });
          } catch (error) {
            if (error instanceof z.ZodError) {
              errors.push(`Row ${index + 1}: ${error.issues.map((e: any) => e.message).join(", ")}`);
            } else {
              errors.push(`Row ${index + 1}: Unknown error`);
            }
          }
        });

        if (errors.length > 0) {
          throw new Error(`CSV validation failed:\n${errors.join("\n")}`);
        }

        await dbHelpers.bulkCreatePricelistItems(validItems);
        return { success: true, itemsCreated: validItems.length };
      }),
    
    update: orgProcedure
      .input(z.object({
        id: z.number(),
        sellPrice: z.string().optional(),
        itemName: z.string().optional(),
        skuCode: z.string().optional(),
        packSize: z.string().optional(),
        packBuyPrice: z.string().optional(),
        looseBuyPrice: z.string().optional(),
        rrpExGst: z.string().optional(),
        rrpIncGst: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...updates } = input;
        const cleanUpdates: Record<string, string | null> = {};
        
        Object.entries(updates).forEach(([key, value]) => {
          if (value !== undefined) {
            cleanUpdates[key] = value || null;
          }
        });

        await dbHelpers.updatePricelistItem(id, ctx.organizationId, cleanUpdates);
        return { success: true };
      }),
    
    bulkUpdate: orgProcedure
      .input(z.object({
        updates: z.array(z.object({
          id: z.number(),
          sellPrice: z.string(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        for (const update of input.updates) {
          await dbHelpers.updatePricelistItem(update.id, ctx.organizationId, { sellPrice: update.sellPrice });
        }
        return { success: true, updatedCount: input.updates.length };
      }),
    
    delete: orgProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await dbHelpers.deletePricelistItem(input.id, ctx.organizationId);
        return { success: true };
      }),
  }),

  customers: router({
    list: orgProcedure.query(async ({ ctx }) => {
      return await dbHelpers.getAllCustomers(ctx.organizationId);
    }),
    
    get: orgProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        return await dbHelpers.getCustomerById(input.id, ctx.organizationId);
      }),
    
    create: orgProcedure
      .input(z.object({
        companyName: z.string().min(1),
        contactName: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().optional(),
        billingAddress: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await dbHelpers.createCustomer({
          ...input,
          email: input.email || null,
          contactName: input.contactName || null,
          phone: input.phone || null,
          billingAddress: input.billingAddress || null,
          notes: input.notes || null,
          organizationId: ctx.organizationId,
        });
      }),
    
    update: orgProcedure
      .input(z.object({
        id: z.number(),
        companyName: z.string().min(1).optional(),
        contactName: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().optional(),
        billingAddress: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...updates } = input;
        const cleanUpdates: Record<string, string | null> = {};
        
        Object.entries(updates).forEach(([key, value]) => {
          if (value !== undefined) {
            cleanUpdates[key] = value || null;
          }
        });

        await dbHelpers.updateCustomer(id, ctx.organizationId, cleanUpdates);
        return { success: true };
      }),
    
    delete: orgProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await dbHelpers.deleteCustomer(input.id, ctx.organizationId);
        return { success: true };
      }),
  }),

  quotes: router({
    list: orgProcedure
      .input(z.object({ customerId: z.number().optional() }).optional())
      .query(async ({ input, ctx }) => {
        if (input?.customerId) {
          return await dbHelpers.getQuotesByCustomer(input.customerId, ctx.organizationId);
        }
        return await dbHelpers.getAllQuotes(ctx.organizationId);
      }),
    
    get: orgProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        return await dbHelpers.getQuoteById(input.id, ctx.organizationId);
      }),
    
    create: orgProcedure
      .input(z.object({
        customerId: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Generate quote number
        const allQuotes = await dbHelpers.getAllQuotes(ctx.organizationId);
        const quoteNumber = `Q${String(allQuotes.length + 1).padStart(5, '0')}`;
        
        return await dbHelpers.createQuote({
          customerId: input.customerId,
          quoteNumber,
          notes: input.notes || null,
          organizationId: ctx.organizationId,
        });
      }),
    
    update: orgProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["draft", "sent", "accepted", "declined"]).optional(),
        notes: z.string().optional(),
        internalNotes: z.string().optional(),
        terms: z.string().optional(),
        expiresAt: z.string().optional(), // ISO date string or empty
        discountPercent: z.number().min(0).max(100).optional(),
        pdfUrl: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, discountPercent, expiresAt, ...rest } = input;
        const cleanUpdates: Record<string, any> = {};

        Object.entries(rest).forEach(([key, value]) => {
          if (value !== undefined) {
            cleanUpdates[key] = value || null;
          }
        });
        if (discountPercent !== undefined) {
          cleanUpdates.discountPercent = discountPercent.toFixed(2);
        }
        if (expiresAt !== undefined) {
          cleanUpdates.expiresAt = expiresAt ? new Date(expiresAt) : null;
        }

        await dbHelpers.updateQuote(id, ctx.organizationId, cleanUpdates);
        return { success: true };
      }),
    
    delete: orgProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await dbHelpers.deleteQuote(input.id, ctx.organizationId);
        return { success: true };
      }),
    
    recalculateTotals: orgProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const items = await dbHelpers.getQuoteItems(input.id);
        
        let totalAmount = 0;
        let totalMargin = 0;
        
        items.forEach(item => {
          totalAmount += parseFloat(item.lineTotal);
          totalMargin += parseFloat(item.margin);
        });
        
        const marginPercentage = totalAmount > 0 ? (totalMargin / totalAmount) * 100 : 0;
        
        await dbHelpers.updateQuote(input.id, ctx.organizationId, {
          totalAmount: totalAmount.toFixed(2),
          totalMargin: totalMargin.toFixed(2),
          marginPercentage: marginPercentage.toFixed(2),
        });
        
        return { success: true };
      }),
    
    addItem: orgProcedure
      .input(z.discriminatedUnion("type", [
        z.object({
          type: z.literal("pricelist"),
          quoteId: z.number(),
          pricelistItemId: z.number(),
          quantity: z.number(),
        }),
        z.object({
          type: z.literal("custom"),
          quoteId: z.number(),
          itemName: z.string().min(1),
          quantity: z.number(),
          sellPrice: z.number().min(0),
          buyPrice: z.number().min(0),
        }),
      ]))
      .mutation(async ({ input, ctx }) => {
        let itemName: string;
        let sellPrice: number;
        let buyPrice: number;
        let pricelistItemId: number | null = null;

        if (input.type === "pricelist") {
          const allItems = await dbHelpers.getAllPricelistItems(ctx.organizationId);
          const pricelistItem = allItems.find(item => item.id === input.pricelistItemId);
          if (!pricelistItem) throw new Error("Pricelist item not found");
          itemName = pricelistItem.itemName;
          sellPrice = parseFloat(pricelistItem.sellPrice || pricelistItem.rrpExGst || "0");
          buyPrice = parseFloat(pricelistItem.looseBuyPrice || "0");
          pricelistItemId = input.pricelistItemId;
        } else {
          itemName = input.itemName;
          sellPrice = input.sellPrice;
          buyPrice = input.buyPrice;
        }

        const lineTotal = sellPrice * input.quantity;
        const margin = (sellPrice - buyPrice) * input.quantity;

        const item = await dbHelpers.createQuoteItem({
          quoteId: input.quoteId,
          pricelistItemId,
          itemName,
          quantity: input.quantity.toString(),
          sellPrice: sellPrice.toString(),
          buyPrice: buyPrice.toString(),
          margin: margin.toString(),
          lineTotal: lineTotal.toString(),
        });

        // Recalculate quote totals
        const items = await dbHelpers.getQuoteItems(input.quoteId);
        let totalAmount = 0;
        let totalMargin = 0;
        items.forEach(i => {
          totalAmount += parseFloat(i.lineTotal);
          totalMargin += parseFloat(i.margin);
        });
        const marginPercentage = totalAmount > 0 ? (totalMargin / totalAmount) * 100 : 0;
        await dbHelpers.updateQuote(input.quoteId, ctx.organizationId, {
          totalAmount: totalAmount.toFixed(2),
          totalMargin: totalMargin.toFixed(2),
          marginPercentage: marginPercentage.toFixed(2),
        });

        return item;
      }),
    
    generatePDF: orgProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const url = await generateQuotePDF(input.id, ctx.organizationId);
        return { url };
      }),

    emailToCustomer: orgProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await sendQuoteEmail(input.id, ctx.organizationId);
        return { success: true };
      }),

    convertToPO: orgProcedure
      .input(z.object({
        quoteId: z.number(),
        supplierId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const quote = await dbHelpers.getQuoteById(input.quoteId, ctx.organizationId);
        if (!quote) throw new TRPCError({ code: "NOT_FOUND", message: "Quote not found" });

        // Generate PO number
        const allPOs = await dbHelpers.getAllPurchaseOrders(ctx.organizationId);
        const poNumber = `PO${String(allPOs.length + 1).padStart(5, "0")}`;

        const po = await dbHelpers.createPurchaseOrder({
          organizationId: ctx.organizationId,
          supplierId: input.supplierId,
          poNumber,
          status: "draft",
          deliveryMethod: "pickup_from_supplier",
          shippingAddress: null,
          totalAmount: "0",
          notes: quote.notes || null,
          sourceQuoteId: input.quoteId,
          pdfUrl: null,
        } as any);

        // Copy line items from quote (use buy prices, not sell prices)
        let totalAmount = 0;
        for (const item of quote.items) {
          const buyPrice = parseFloat(item.buyPrice);
          const quantity = parseFloat(item.quantity);
          const lineTotal = buyPrice * quantity;
          totalAmount += lineTotal;

          await dbHelpers.createPurchaseOrderItem({
            purchaseOrderId: po.id,
            pricelistItemId: item.pricelistItemId || null,
            itemName: item.itemName,
            quantity: item.quantity,
            buyPrice: item.buyPrice,
            lineTotal: lineTotal.toFixed(2),
          });
        }

        // Update PO total
        await dbHelpers.updatePurchaseOrder(po.id, ctx.organizationId, {
          totalAmount: totalAmount.toFixed(2),
        });

        return { poId: po.id };
      }),

    markInvoiced: orgProcedure
      .input(z.object({
        id: z.number(),
        invoiceNumber: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await dbHelpers.updateQuote(input.id, ctx.organizationId, {
          invoicedAt: new Date(),
          invoiceNumber: input.invoiceNumber || null,
        } as any);
        return { success: true };
      }),

    markPaid: orgProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await dbHelpers.updateQuote(input.id, ctx.organizationId, {
          paidAt: new Date(),
        } as any);
        return { success: true };
      }),
  }),

  quoteItems: router({
    list: orgProcedure
      .input(z.object({ quoteId: z.number() }))
      .query(async ({ input, ctx }) => {
        return await dbHelpers.getQuoteItems(input.quoteId);
      }),
    
    create: orgProcedure
      .input(z.object({
        quoteId: z.number(),
        pricelistItemId: z.number().optional(),
        itemName: z.string(),
        quantity: z.number(),
        sellPrice: z.number(),
        buyPrice: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const lineTotal = input.sellPrice * input.quantity;
        const margin = (input.sellPrice - input.buyPrice) * input.quantity;
        
        const item = await dbHelpers.createQuoteItem({
          quoteId: input.quoteId,
          pricelistItemId: input.pricelistItemId || null,
          itemName: input.itemName,
          quantity: input.quantity.toFixed(2),
          sellPrice: input.sellPrice.toFixed(2),
          buyPrice: input.buyPrice.toFixed(2),
          margin: margin.toFixed(2),
          lineTotal: lineTotal.toFixed(2),
        });
        
        return item;
      }),
    
    update: orgProcedure
      .input(z.object({
        id: z.number(),
        quantity: z.number().optional(),
        sellPrice: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...updates } = input;
        
        // First, get the item to find its quoteId
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");
        const { quoteItems } = await import("../drizzle/schema");
        const allItems = await db.select().from(quoteItems).where(eq(quoteItems.id, id));
        const currentItem = allItems[0];
        
        if (!currentItem) {
          throw new Error("Quote item not found");
        }
        
        const quantity = updates.quantity ?? parseFloat(currentItem.quantity);
        const sellPrice = updates.sellPrice ?? parseFloat(currentItem.sellPrice);
        const buyPrice = parseFloat(currentItem.buyPrice);
        
        const lineTotal = sellPrice * quantity;
        const margin = (sellPrice - buyPrice) * quantity;
        
        // Update the item
        await dbHelpers.updateQuoteItem(id, {
          quantity: quantity.toFixed(2),
          sellPrice: sellPrice.toFixed(2),
          margin: margin.toFixed(2),
          lineTotal: lineTotal.toFixed(2),
        });
        
        // Recalculate quote totals
        const items = await dbHelpers.getQuoteItems(currentItem.quoteId);
        let totalAmount = 0;
        let totalMargin = 0;
        
        items.forEach(item => {
          totalAmount += parseFloat(item.lineTotal);
          totalMargin += parseFloat(item.margin);
        });
        
        const marginPercentage = totalAmount > 0 ? (totalMargin / totalAmount) * 100 : 0;
        
        await dbHelpers.updateQuote(currentItem.quoteId, ctx.organizationId, {
          totalAmount: totalAmount.toFixed(2),
          totalMargin: totalMargin.toFixed(2),
          marginPercentage: marginPercentage.toFixed(2),
        });
        
        return { success: true };
      }),
    
    delete: orgProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Get the item to find its quoteId before deleting
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");
        const { quoteItems } = await import("../drizzle/schema");
        const allItems = await db.select().from(quoteItems).where(eq(quoteItems.id, input.id));
        const currentItem = allItems[0];
        
        if (!currentItem) {
          throw new Error("Quote item not found");
        }
        
        // Delete the item
        await dbHelpers.deleteQuoteItem(input.id);
        
        // Recalculate quote totals
        const items = await dbHelpers.getQuoteItems(currentItem.quoteId);
        let totalAmount = 0;
        let totalMargin = 0;
        
        items.forEach(item => {
          totalAmount += parseFloat(item.lineTotal);
          totalMargin += parseFloat(item.margin);
        });
        
        const marginPercentage = totalAmount > 0 ? (totalMargin / totalAmount) * 100 : 0;
        
        await dbHelpers.updateQuote(currentItem.quoteId, ctx.organizationId, {
          totalAmount: totalAmount.toFixed(2),
          totalMargin: totalMargin.toFixed(2),
          marginPercentage: marginPercentage.toFixed(2),
        });
        
        return { success: true };
      }),
  }),

  purchaseOrders: router({
    list: orgProcedure.query(async ({ ctx }) => {
      return await dbHelpers.getAllPurchaseOrders(ctx.organizationId);
    }),
    
    listBySupplier: orgProcedure
      .input(z.object({ supplierId: z.number() }))
      .query(async ({ input, ctx }) => {
        return await dbHelpers.getPurchaseOrdersBySupplier(input.supplierId, ctx.organizationId);
      }),
    
    get: orgProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        return await dbHelpers.getPurchaseOrderById(input.id, ctx.organizationId);
      }),
    
    create: orgProcedure
      .input(z.object({
        supplierId: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        console.log('[PO CREATE] Context:', { userId: ctx.user?.id, organizationId: ctx.organizationId });
        console.log('[PO CREATE] Input:', input);
        
        // Generate PO number
        const allPOs = await dbHelpers.getAllPurchaseOrders(ctx.organizationId);
        const poNumber = `PO${String(allPOs.length + 1).padStart(5, '0')}`;
        
        const poData = {
          organizationId: ctx.organizationId,
          supplierId: input.supplierId,
          poNumber,
          status: "draft" as const,
          deliveryMethod: "pickup_from_supplier" as const,
          shippingAddress: null,
          totalAmount: "0",
          notes: input.notes || null,
          pdfUrl: null,
        };
        
        console.log('[PO CREATE] Creating PO with data:', poData);
        
        return await dbHelpers.createPurchaseOrder(poData);
      }),
    
    update: orgProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["draft", "sent", "received", "cancelled"]).optional(),
        deliveryMethod: z.enum(["in_store_delivery", "pickup_from_supplier"]).optional(),
        shippingAddress: z.string().optional(),
        notes: z.string().optional(),
        pdfUrl: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...updates } = input;
        const cleanUpdates: Record<string, string | null> = {};
        
        Object.entries(updates).forEach(([key, value]) => {
          if (value !== undefined) {
            cleanUpdates[key] = value || null;
          }
        });

        await dbHelpers.updatePurchaseOrder(id, ctx.organizationId, cleanUpdates);
        return { success: true };
      }),
    
    delete: orgProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await dbHelpers.deletePurchaseOrder(input.id, ctx.organizationId);
        return { success: true };
      }),
    
    addItem: orgProcedure
      .input(z.discriminatedUnion("type", [
        z.object({
          type: z.literal("pricelist"),
          purchaseOrderId: z.number(),
          pricelistItemId: z.number(),
          quantity: z.number(),
        }),
        z.object({
          type: z.literal("custom"),
          purchaseOrderId: z.number(),
          itemName: z.string().min(1),
          quantity: z.number(),
          buyPrice: z.number().min(0),
        }),
      ]))
      .mutation(async ({ input, ctx }) => {
        let itemName: string;
        let buyPrice: number;
        let pricelistItemId: number | null = null;

        if (input.type === "pricelist") {
          const allItems = await dbHelpers.getAllPricelistItems(ctx.organizationId);
          const pricelistItem = allItems.find(item => item.id === input.pricelistItemId);
          if (!pricelistItem) throw new Error("Pricelist item not found");
          itemName = pricelistItem.itemName;
          buyPrice = parseFloat(pricelistItem.looseBuyPrice || "0");
          pricelistItemId = input.pricelistItemId;
        } else {
          itemName = input.itemName;
          buyPrice = input.buyPrice;
        }

        const lineTotal = buyPrice * input.quantity;

        const item = await dbHelpers.createPurchaseOrderItem({
          purchaseOrderId: input.purchaseOrderId,
          pricelistItemId,
          itemName,
          quantity: input.quantity.toString(),
          buyPrice: buyPrice.toString(),
          lineTotal: lineTotal.toString(),
        });

        // Recalculate PO totals
        const items = await dbHelpers.getPurchaseOrderItems(input.purchaseOrderId);
        let totalAmount = 0;
        items.forEach(i => { totalAmount += parseFloat(i.lineTotal); });
        await dbHelpers.updatePurchaseOrder(input.purchaseOrderId, ctx.organizationId, {
          totalAmount: totalAmount.toFixed(2),
        });

        return item;
      }),
    
    recalculateTotals: orgProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const items = await dbHelpers.getPurchaseOrderItems(input.id);
        
        let totalAmount = 0;
        
        items.forEach(item => {
          totalAmount += parseFloat(item.lineTotal);
        });
        
        await dbHelpers.updatePurchaseOrder(input.id, ctx.organizationId, {
          totalAmount: totalAmount.toFixed(2),
        });
        
        return { success: true };
      }),
    
    generatePDF: orgProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const url = await generatePurchaseOrderPDF(input.id, ctx.organizationId);
        return { url };
      }),
    
    sendEmail: orgProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await sendPurchaseOrderEmail(input.id, ctx.organizationId);
        return { success: true };
      }),
  }),

  purchaseOrderItems: router({
    list: orgProcedure
      .input(z.object({ purchaseOrderId: z.number() }))
      .query(async ({ input, ctx }) => {
        return await dbHelpers.getPurchaseOrderItems(input.purchaseOrderId);
      }),
    
    create: orgProcedure
      .input(z.object({
        purchaseOrderId: z.number(),
        pricelistItemId: z.number().optional(),
        itemName: z.string(),
        quantity: z.number(),
        buyPrice: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const lineTotal = input.buyPrice * input.quantity;
        
        const item = await dbHelpers.createPurchaseOrderItem({
          purchaseOrderId: input.purchaseOrderId,
          pricelistItemId: input.pricelistItemId || null,
          itemName: input.itemName,
          quantity: input.quantity.toFixed(2),
          buyPrice: input.buyPrice.toFixed(2),
          lineTotal: lineTotal.toFixed(2),
        });
        
        // Recalculate PO totals
        const items = await dbHelpers.getPurchaseOrderItems(input.purchaseOrderId);
        let totalAmount = 0;
        
        items.forEach(item => {
          totalAmount += parseFloat(item.lineTotal);
        });
        
        await dbHelpers.updatePurchaseOrder(input.purchaseOrderId, ctx.organizationId, {
          totalAmount: totalAmount.toFixed(2),
        });
        
        return item;
      }),
    
    update: orgProcedure
      .input(z.object({
        id: z.number(),
        quantity: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, quantity: newQuantity } = input;
        
        // Get current item and its pricelist item details
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");
        const { purchaseOrderItems, pricelistItems } = await import("../drizzle/schema");
        
        const allItems = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.id, id));
        const currentItem = allItems[0];
        
        if (!currentItem) {
          throw new Error("Purchase order item not found");
        }
        
        const quantity = newQuantity ?? parseFloat(currentItem.quantity);
        
        // Get pricelist item to recalculate buy price
        let buyPrice = parseFloat(currentItem.buyPrice);
        
        if (currentItem.pricelistItemId) {
          const pricelistItemData = await db.select().from(pricelistItems)
            .where(eq(pricelistItems.id, currentItem.pricelistItemId));
          
          if (pricelistItemData.length > 0) {
            const pricelistItem = pricelistItemData[0];
            const { calculateBuyPrice } = await import("./buyPriceLogic");
            
            buyPrice = calculateBuyPrice(quantity, {
              looseBuyPrice: pricelistItem.looseBuyPrice,
              packBuyPrice: pricelistItem.packBuyPrice,
              packSize: pricelistItem.packSize,
            });
          }
        }
        
        const lineTotal = buyPrice * quantity;
        
        // Update the item
        await dbHelpers.updatePurchaseOrderItem(id, {
          quantity: quantity.toFixed(2),
          buyPrice: buyPrice.toFixed(2),
          lineTotal: lineTotal.toFixed(2),
        });
        
        // Recalculate PO totals
        const items = await dbHelpers.getPurchaseOrderItems(currentItem.purchaseOrderId);
        let totalAmount = 0;
        
        items.forEach(item => {
          totalAmount += parseFloat(item.lineTotal);
        });
        
        await dbHelpers.updatePurchaseOrder(currentItem.purchaseOrderId, ctx.organizationId, {
          totalAmount: totalAmount.toFixed(2),
        });
        
        return { success: true, buyPrice: buyPrice.toFixed(2) };
      }),
    
    delete: orgProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Get the item to find its purchaseOrderId before deleting
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");
        const { purchaseOrderItems } = await import("../drizzle/schema");
        const allItems = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.id, input.id));
        const currentItem = allItems[0];
        
        if (!currentItem) {
          throw new Error("Purchase order item not found");
        }
        
        // Delete the item
        await dbHelpers.deletePurchaseOrderItem(input.id);
        
        // Recalculate PO totals
        const items = await dbHelpers.getPurchaseOrderItems(currentItem.purchaseOrderId);
        let totalAmount = 0;
        
        items.forEach(item => {
          totalAmount += parseFloat(item.lineTotal);
        });
        
        await dbHelpers.updatePurchaseOrder(currentItem.purchaseOrderId, ctx.organizationId, {
          totalAmount: totalAmount.toFixed(2),
        });
        
        return { success: true };
      }),
  }),

  suppliers: router({
    list: orgProcedure.query(async ({ ctx }) => {
      return await dbHelpers.getAllSuppliers(ctx.organizationId);
    }),
    
    get: orgProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        return await dbHelpers.getSupplierById(input.id, ctx.organizationId);
      }),
    
    create: orgProcedure
      .input(z.object({
        companyName: z.string().min(1),
        billingAddress: z.string().optional(),
        keyContactName: z.string().optional(),
        keyContactEmail: z.string().email().optional().or(z.literal("")),
        poEmail: z.string().email(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await dbHelpers.createSupplier({
          ...input,
          billingAddress: input.billingAddress || null,
          keyContactName: input.keyContactName || null,
          keyContactEmail: input.keyContactEmail || null,
          notes: input.notes || null,
          organizationId: ctx.organizationId,
        });
      }),
    
    update: orgProcedure
      .input(z.object({
        id: z.number(),
        companyName: z.string().min(1).optional(),
        billingAddress: z.string().optional(),
        keyContactName: z.string().optional(),
        keyContactEmail: z.string().email().optional().or(z.literal("")),
        poEmail: z.string().email().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...updates } = input;
        const cleanUpdates: Record<string, string | null> = {};
        
        Object.entries(updates).forEach(([key, value]) => {
          if (value !== undefined) {
            cleanUpdates[key] = value || null;
          }
        });

        await dbHelpers.updateSupplier(id, ctx.organizationId, cleanUpdates);
        return { success: true };
      }),
    
    delete: orgProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await dbHelpers.deleteSupplier(input.id, ctx.organizationId);
        return { success: true };
      }),
  }),

  companySettings: router({
    get: orgProcedure.query(async ({ ctx }) => {
      return await dbHelpers.getCompanySettings(ctx.organizationId);
    }),
    
    upsert: orgProcedure
      .input(z.object({
        companyName: z.string().optional(),
        abn: z.string().optional(),
        address: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        logoUrl: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const cleanInput: Record<string, string | null> = {};
        
        Object.entries(input).forEach(([key, value]) => {
          if (value !== undefined) {
            cleanInput[key] = value || null;
          }
        });
        
        return await dbHelpers.upsertCompanySettings(ctx.organizationId, cleanInput);
      }),
    
    uploadLogo: orgProcedure
      .input(z.object({
        fileData: z.string(), // base64 encoded file
        fileName: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { storagePut } = await import("./storage");

        // Server-side MIME type whitelist — never trust client-supplied mimeType alone
        const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
        if (!ALLOWED_MIME_TYPES.includes(input.mimeType)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Only image files are allowed (JPEG, PNG, WebP, GIF, SVG)." });
        }

        // Verify the actual buffer magic bytes match the declared MIME type
        const buffer = Buffer.from(input.fileData, "base64");
        const MAGIC: Record<string, Buffer[]> = {
          "image/jpeg": [Buffer.from([0xff, 0xd8, 0xff])],
          "image/png":  [Buffer.from([0x89, 0x50, 0x4e, 0x47])],
          "image/webp": [Buffer.from("RIFF")], // checked via offset 8 too, partial is fine as a sanity check
          "image/gif":  [Buffer.from("GIF87a"), Buffer.from("GIF89a")],
          "image/svg+xml": [], // SVG is text-based, skip magic bytes check
        };
        const magics = MAGIC[input.mimeType];
        if (magics && magics.length > 0) {
          const matches = magics.some(magic => buffer.subarray(0, magic.length).equals(magic));
          if (!matches) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "File content does not match the declared image type." });
          }
        }

        // Max 5 MB
        if (buffer.byteLength > 5 * 1024 * 1024) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Logo file must be smaller than 5 MB." });
        }

        // Generate unique filename using the declared extension derived from MIME type
        const MIME_TO_EXT: Record<string, string> = {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/webp": "webp",
          "image/gif": "gif",
          "image/svg+xml": "svg",
        };
        const fileExtension = MIME_TO_EXT[input.mimeType];
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(7);
        const fileKey = `company-logos/logo-${timestamp}-${randomSuffix}.${fileExtension}`;

        // Upload to S3
        const { url } = await storagePut(fileKey, buffer, input.mimeType);

        // Update company settings with new logo URL
        await dbHelpers.upsertCompanySettings(ctx.organizationId, { logoUrl: url });

        return { url };
      }),
  }),

  contact: router({
    list: superAdminProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      return await db.select().from(contactInquiries).orderBy(contactInquiries.createdAt);
    }),

    updateStatus: superAdminProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["new", "contacted", "converted", "archived"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.update(contactInquiries).set({ status: input.status }).where(eq(contactInquiries.id, input.id));
        return { success: true };
      }),

    delete: superAdminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.delete(contactInquiries).where(eq(contactInquiries.id, input.id));
        return { success: true };
      }),

    submit: publicProcedure
      .input(
        z.object({
          name: z.string().min(1, "Name is required"),
          email: z.string().email("Invalid email address"),
          company: z.string().optional(),
          message: z.string().min(10, "Message must be at least 10 characters"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.insert(contactInquiries).values({
          name: input.name,
          email: input.email,
          company: input.company || null,
          message: input.message,
          status: "new",
        });

        // Send email notification to admin
        try {
          await notifyOwner({
            title: "🔔 New Contact Form Submission - TradeFlow",
            content: `A new inquiry has been submitted through the TradeFlow website.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 CONTACT DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 Name: ${input.name}
📧 Email: ${input.email}${input.company ? `\n🏢 Company: ${input.company}` : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💬 MESSAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${input.message}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏰ Submitted: ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}

💡 Action Required: Reply to ${input.email} to follow up on this inquiry.`,
          });
        } catch (error) {
          console.error("Failed to send email notification:", error);
          // Don't fail the mutation if email fails
        }

        return { success: true };
      }),
  }),

  // Organizations router (super admin only)
  organizations: router({
    list: superAdminProcedure.query(async () => {
      return dbHelpers.getAllOrganizations();
    }),

    create: superAdminProcedure
      .input(z.object({
        name: z.string().min(1),
        subscriptionType: z.enum(["monthly", "annual", "indefinite"]).default("monthly"),
        ownerEmail: z.string().email().optional(),
        ownerName: z.string().optional(),
        ownerPassword: z.string().min(8).optional(),
        userLimit: z.number().min(1).default(1),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        const supportCode = String(Math.floor(100000 + Math.random() * 900000));
        let endDate: Date | null = null;
        if (input.subscriptionType === "monthly") {
          endDate = new Date();
          endDate.setMonth(endDate.getMonth() + 1);
        } else if (input.subscriptionType === "annual") {
          endDate = new Date();
          endDate.setFullYear(endDate.getFullYear() + 1);
        }
        const [orgResult] = await db.insert(organizations).values({
          name: input.name,
          subscriptionType: input.subscriptionType,
          subscriptionStatus: input.subscriptionType === "indefinite" ? "active" : "active",
          subscriptionEndDate: endDate,
          userLimit: input.userLimit,
          supportCode,
        });
        const orgId = Number(orgResult.insertId);
        // Optionally create an owner user
        if (input.ownerEmail && input.ownerName && input.ownerPassword) {
          const passwordHash = await customAuth.hashPassword(input.ownerPassword);
          await db.insert(users).values({
            email: input.ownerEmail.toLowerCase(),
            passwordHash,
            name: input.ownerName,
            loginMethod: "email",
            role: "org_owner",
            status: "active",
            organizationId: orgId,
          });
        }
        return { id: orgId, supportCode };
      }),

    updateSubscription: superAdminProcedure
      .input(z.object({
        organizationId: z.number(),
        subscriptionType: z.enum(["monthly", "annual", "indefinite"]),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

        // Calculate new end date based on subscription type
        let subscriptionEndDate: Date | null = null;
        if (input.subscriptionType === "monthly") {
          subscriptionEndDate = new Date();
          subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
        } else if (input.subscriptionType === "annual") {
          subscriptionEndDate = new Date();
          subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1);
        }

        await db.update(organizations)
          .set({ 
            subscriptionType: input.subscriptionType,
            subscriptionEndDate,
            subscriptionStatus: "active",
          })
          .where(eq(organizations.id, input.organizationId));

        return { success: true };
      }),

    extendSubscription: superAdminProcedure
      .input(z.object({
        organizationId: z.number(),
        days: z.number().min(1),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

        const org = await db.select().from(organizations).where(eq(organizations.id, input.organizationId)).limit(1);
        if (org.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
        }

        const currentEndDate = org[0].subscriptionEndDate || new Date();
        const newEndDate = new Date(currentEndDate);
        newEndDate.setDate(newEndDate.getDate() + input.days);

        await db.update(organizations)
          .set({ 
            subscriptionEndDate: newEndDate,
            subscriptionStatus: "active",
          })
          .where(eq(organizations.id, input.organizationId));

        return { success: true };
      }),

    updateUserLimit: superAdminProcedure
      .input(z.object({
        organizationId: z.number(),
        userLimit: z.number().min(1),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

        await db.update(organizations)
          .set({ userLimit: input.userLimit })
          .where(eq(organizations.id, input.organizationId));

        return { success: true };
      }),

    setSuspended: superAdminProcedure
      .input(z.object({ organizationId: z.number(), suspended: z.boolean() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        await db.update(organizations)
          .set({ suspended: input.suspended ? 1 : 0 })
          .where(eq(organizations.id, input.organizationId));
        return { success: true };
      }),

    updateStatus: superAdminProcedure
      .input(z.object({
        organizationId: z.number(),
        status: z.enum(["active", "expired", "cancelled", "trial"]),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        await db.update(organizations)
          .set({ subscriptionStatus: input.status })
          .where(eq(organizations.id, input.organizationId));
        return { success: true };
      }),

    getWithUsers: superAdminProcedure
      .input(z.object({ organizationId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const org = await db.select().from(organizations).where(eq(organizations.id, input.organizationId)).limit(1);
        if (!org.length) throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
        const orgUsers = await db.select().from(users).where(eq(users.organizationId, input.organizationId));
        return { ...org[0], users: orgUsers };
      }),

    stats: superAdminProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const allOrgs = await db.select().from(organizations);
      const allUsers = await db.select().from(users);
      const now = new Date();
      return {
        totalOrgs: allOrgs.length,
        active: allOrgs.filter(o => o.subscriptionStatus === "active" && (!o.subscriptionEndDate || new Date(o.subscriptionEndDate) > now)).length,
        trialing: allOrgs.filter(o => o.subscriptionStatus === "trial" && (!o.subscriptionEndDate || new Date(o.subscriptionEndDate) > now)).length,
        expired: allOrgs.filter(o => o.subscriptionStatus === "expired" || o.subscriptionStatus === "cancelled" || (o.subscriptionEndDate && new Date(o.subscriptionEndDate) < now && o.subscriptionStatus !== "active")).length,
        suspended: allOrgs.filter(o => o.suspended === 1).length,
        totalUsers: allUsers.filter(u => u.role !== "super_admin").length,
      };
    }),

    resetUserPassword: superAdminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const tempPassword = Math.random().toString(36).slice(-8) + "A1!";
        const passwordHash = await customAuth.hashPassword(tempPassword);
        await db.update(users).set({ passwordHash, status: "active" }).where(eq(users.id, input.userId));
        return { tempPassword };
      }),
  }),

  // Super admin impersonation
  superAdmin: router({
    startImpersonation: superAdminProcedure
      .input(z.object({ code: z.string().length(6) }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        const org = await db.select().from(organizations).where(eq(organizations.supportCode, input.code)).limit(1);
        if (!org.length) throw new TRPCError({ code: "NOT_FOUND", message: "No organisation found with that code" });

        // Find org owner
        const orgUsers = await db.select().from(users)
          .where(and(eq(users.organizationId, org[0].id), eq(users.status, "active")))
          .limit(10);

        const owner = orgUsers.find(u => u.role === "org_owner") ?? orgUsers[0];
        if (!owner) throw new TRPCError({ code: "NOT_FOUND", message: "No active user found in that organisation" });

        // Create impersonation JWT
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
        const token = await new SignJWT({
          userId: owner.id,
          email: owner.email,
          impersonating: true,
          impersonatedBy: ctx.user.id,
        })
          .setProtectedHeader({ alg: "HS256" })
          .setExpirationTime("4h")
          .sign(secret);

        const isSecure = ctx.req.protocol === "https";
        ctx.res.cookie("impersonation_session", token, {
          httpOnly: true,
          secure: isSecure,
          sameSite: isSecure ? "none" : "lax",
          path: "/",
          maxAge: 4 * 60 * 60 * 1000, // 4 hours
        });

        return { success: true, orgName: org[0].name, ownerEmail: owner.email };
      }),

    exitImpersonation: protectedProcedure.mutation(({ ctx }) => {
      const isSecure = ctx.req.protocol === "https";
      ctx.res.clearCookie("impersonation_session", {
        httpOnly: true,
        secure: isSecure,
        sameSite: isSecure ? "none" : "lax",
        path: "/",
      });
      return { success: true };
    }),
  }),

  // Support code for org owners (to share with admin for impersonation)
  support: router({
    getCode: orgOwnerProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const org = await db.select().from(organizations).where(eq(organizations.id, ctx.organizationId)).limit(1);
      if (!org.length) throw new TRPCError({ code: "NOT_FOUND", message: "Organisation not found" });
      return { code: org[0].supportCode ?? null, orgName: org[0].name };
    }),
  }),

  // Organization Users router (for org owners to manage their team)
  organizationUsers: router({
    list: orgOwnerProcedure.query(async ({ ctx }) => {
      return dbHelpers.getUsersByOrganization(ctx.organizationId);
    }),

    resetPassword: orgOwnerProcedure
      .input(z.object({
        userId: z.number(),
        newPassword: z.string().min(8, "Password must be at least 8 characters"),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

        // Verify user belongs to the same organization
        const targetUser = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
        if (targetUser.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }

        if (targetUser[0].organizationId !== ctx.organizationId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Cannot reset password for users outside your organization" });
        }

        // Hash and update password
        const newPasswordHash = await customAuth.hashPassword(input.newPassword);
        await db.update(users)
          .set({ passwordHash: newPasswordHash, status: "active" })
          .where(eq(users.id, input.userId));

        return { success: true };
      }),

    invite: orgOwnerProcedure
      .input(z.object({
        email: z.string().email(),
        name: z.string().min(1),
        role: z.enum(["user", "org_owner"]),
      }))
      .mutation(async ({ input, ctx }) => {
        // Check if user already exists
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        const existingUser = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
        if (existingUser.length > 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "User with this email already exists" });
        }

        // Get organization name
        const { organizations } = await import("../drizzle/schema");
        const org = await db.select().from(organizations).where(eq(organizations.id, ctx.organizationId)).limit(1);
        if (org.length === 0) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Organization not found" });
        }

        // Create new user
        await db.insert(users).values({
          email: input.email,
          name: input.name,
          role: input.role,
          organizationId: ctx.organizationId,
          loginMethod: "email",
          status: "pending",
        });

        // Send invitation email
        try {
          const { sendInvitationEmail } = await import("./email");
          await sendInvitationEmail({
            email: input.email,
            name: input.name,
            organizationName: org[0].name,
            inviterName: ctx.user.name || "Team Admin",
          });
        } catch (error) {
          console.error("Failed to send invitation email:", error);
          // Don't fail the mutation if email fails
        }

        return { success: true };
      }),

    updateRole: orgOwnerProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(["user", "org_owner"]),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        // Verify user belongs to the same organization
        const targetUser = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
        if (targetUser.length === 0 || targetUser[0].organizationId !== ctx.organizationId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Cannot modify user from different organization" });
        }

        await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
        return { success: true };
      }),

    delete: orgOwnerProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        // Verify user belongs to the same organization
        const targetUser = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
        if (targetUser.length === 0 || targetUser[0].organizationId !== ctx.organizationId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete user from different organization" });
        }

        // Prevent deleting the last org owner
        const orgOwners = await db.select().from(users)
          .where(and(eq(users.organizationId, ctx.organizationId), eq(users.role, "org_owner")));
        
        if (orgOwners.length === 1 && orgOwners[0].id === input.userId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot delete the last organization owner" });
        }

        await db.delete(users).where(eq(users.id, input.userId));
        return { success: true };
      }),
  }),

  // Users router (super admin only)
  users: router({
    list: superAdminProcedure.query(async () => {
      return dbHelpers.getAllUsers();
    }),

    create: superAdminProcedure
      .input(z.object({
        email: z.string().email(),
        name: z.string().min(1),
        role: z.enum(["user", "org_owner"]),
        organizationId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        // Check if user already exists
        const existingUser = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
        if (existingUser.length > 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "User with this email already exists" });
        }

        // Check organization user limit
        const org = await db.select().from(organizations).where(eq(organizations.id, input.organizationId)).limit(1);
        if (org.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
        }
        
        const currentUserCount = await db.select().from(users).where(eq(users.organizationId, input.organizationId));
        if (currentUserCount.length >= org[0].userLimit) {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: `Organization has reached its user limit of ${org[0].userLimit} users` 
          });
        }

        // Create new user
        await db.insert(users).values({
          email: input.email,
          name: input.name,
          role: input.role,
          organizationId: input.organizationId,
          loginMethod: "email",
          status: "pending",
        });

        return { email: input.email };
      }),

    assignToOrganization: superAdminProcedure
      .input(z.object({ 
        userId: z.number(), 
        organizationId: z.number() 
      }))
      .mutation(async ({ input }) => {
        await dbHelpers.assignUserToOrganization(input.userId, input.organizationId);
        return { success: true };
      }),

    updateOrganization: superAdminProcedure
      .input(z.object({ 
        userId: z.number(), 
        organizationId: z.number() 
      }))
      .mutation(async ({ input }) => {
        await dbHelpers.assignUserToOrganization(input.userId, input.organizationId);
        return { success: true };
      }),

    delete: superAdminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

        // Prevent super admins from deleting their own account
        if (input.userId === ctx.user.id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot delete your own super admin account." });
        }

        await db.delete(users).where(eq(users.id, input.userId));
        return { success: true };
      }),
  }),

  dashboard: router({
    getStats: orgProcedure.query(async ({ ctx }) => {
      return await dbHelpers.getDashboardStats(ctx.organizationId);
    }),
  }),

  // Shipping addresses router
  shippingAddresses: router({
    list: orgProcedure.query(async ({ ctx }) => {
      return dbHelpers.getShippingAddressesByOrganization(ctx.organizationId);
    }),

    create: orgProcedure
      .input(z.object({
        attentionTo: z.string().optional(),
        streetAddress: z.string().min(1),
        state: z.string().optional(),
        postcode: z.string().optional(),
        country: z.string().default("Australia"),
        phoneNumber: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return dbHelpers.createShippingAddress({
          ...input,
          organizationId: ctx.organizationId,
        });
      }),

    delete: orgProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await dbHelpers.deleteShippingAddress(input.id, ctx.organizationId);
        return { success: true };
      }),
  }),

  // ---------------------------------------------------------------------------
  // Billing — trial signup, Stripe checkout, subscription status
  // ---------------------------------------------------------------------------
  billing: router({

    /** Start a 7-day free trial — creates org + owner user immediately, no payment required */
    startTrial: publicProcedure
      .input(z.object({
        ownerName: z.string().min(1),
        email: z.string().email(),
        companyName: z.string().min(1),
        password: z.string().min(8, "Password must be at least 8 characters"),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        // Check email not already registered
        const existing = await db.select().from(users).where(eq(users.email, input.email.toLowerCase())).limit(1);
        if (existing.length > 0) {
          throw new TRPCError({ code: "CONFLICT", message: "An account with this email already exists. Please log in." });
        }

        // Create org in trial state
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 7);
        const supportCode = String(Math.floor(100000 + Math.random() * 900000));

        const [orgResult] = await db.insert(organizations).values({
          name: input.companyName,
          subscriptionType: "monthly",
          subscriptionStatus: "trial",
          subscriptionEndDate: trialEnd,
          userLimit: 3, // 3 seats during trial — creates upsell pressure on expiry
          supportCode,
        });
        const orgId = Number(orgResult.insertId);

        // Create owner user directly (correct argument order)
        const passwordHash = await customAuth.hashPassword(input.password);
        await db.insert(users).values({
          email: input.email.toLowerCase(),
          passwordHash,
          name: input.ownerName,
          loginMethod: "email",
          role: "org_owner",
          status: "active",
          organizationId: orgId,
        });

        // Send welcome email
        const html = `
          <html><body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a5c5a;">Welcome to TradeFlow!</h2>
            <p>Hi ${input.ownerName},</p>
            <p>Your 7-day free trial has started. You can log in now and start quoting straight away.</p>
            <p style="margin: 24px 0;">
              <a href="${ENV.appUrl}/login" style="background: #2aacaa; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
                Log in to TradeFlow
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">
              Your trial ends on <strong>${trialEnd.toLocaleDateString("en-AU", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</strong>.
              You can upgrade to a paid plan any time from your account settings.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
            <p style="color: #999; font-size: 12px;">TradeFlow by DevEdge · <a href="${ENV.appUrl}">tradeflow.devedge.com.au</a></p>
          </body></html>
        `;

        await sendSystemEmail({
          to: input.email,
          subject: "Your TradeFlow trial has started — log in now",
          html,
          text: `Welcome to TradeFlow, ${input.ownerName}! Log in at ${ENV.appUrl}/login. Your trial ends ${trialEnd.toLocaleDateString("en-AU")}.`,
        });

        return { success: true };
      }),

    /** Create a Stripe Checkout session for a brand-new customer paying upfront */
    createCheckoutSession: publicProcedure
      .input(z.object({
        plan: z.enum(["monthly", "annual"]),
        email: z.string().email(),
        companyName: z.string().min(1),
        ownerName: z.string().min(1),
        seatOption: z.discriminatedUnion("type", [
          z.object({ type: z.literal("none") }),
          z.object({ type: z.literal("pack4") }),
          z.object({ type: z.literal("pack9") }),
          z.object({ type: z.literal("custom"), extra: z.number().min(1).max(50) }),
        ]).default({ type: "none" }),
      }))
      .mutation(async ({ input }) => {
        const url = await createNewSignupCheckoutSession(input);
        return { url };
      }),

    /** Upgrade an existing trial org to paid — authenticated */
    createUpgradeSession: orgOwnerProcedure
      .input(z.object({
        plan: z.enum(["monthly", "annual"]),
        seatOption: z.discriminatedUnion("type", [
          z.object({ type: z.literal("none") }),
          z.object({ type: z.literal("pack4") }),
          z.object({ type: z.literal("pack9") }),
          z.object({ type: z.literal("custom"), extra: z.number().min(1).max(50) }),
        ]).default({ type: "none" }),
      }))
      .mutation(async ({ input, ctx }) => {
        const url = await createUpgradeCheckoutSession({
          plan: input.plan,
          seatOption: input.seatOption as SeatOption,
          email: ctx.user.email,
          companyName: ctx.organization.name,
          organizationId: ctx.organizationId,
          stripeCustomerId: ctx.organization.stripeCustomerId,
        });
        return { url };
      }),

    /** Open Stripe billing portal for paid subscribers */
    createPortalSession: orgOwnerProcedure
      .mutation(async ({ ctx }) => {
        if (!ctx.organization.stripeCustomerId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "No billing account linked. Please upgrade first." });
        }
        const url = await createPortalSession({ stripeCustomerId: ctx.organization.stripeCustomerId });
        return { url };
      }),

    /** Get current billing status for Settings page */
    getStatus: protectedProcedure
      .query(async ({ ctx }) => {
        if (!ctx.organizationId) return null;
        const db = await getDb();
        if (!db) return null;
        const org = await db.select().from(organizations).where(eq(organizations.id, ctx.organizationId)).limit(1);
        if (!org.length) return null;
        const o = org[0];
        const now = new Date();
        const endDate = o.subscriptionEndDate ? new Date(o.subscriptionEndDate) : null;
        const daysLeft = endDate ? Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : null;
        return {
          status: o.subscriptionStatus,
          type: o.subscriptionType,
          endDate: endDate?.toISOString() ?? null,
          daysLeft,
          stripeCustomerId: o.stripeCustomerId,
          seats: o.userLimit,
          isTrialing: o.subscriptionStatus === "trial",
          isPaid: o.subscriptionStatus === "active",
          isExpired: o.subscriptionStatus === "expired" || o.subscriptionStatus === "cancelled" || (endDate !== null && endDate < now),
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
