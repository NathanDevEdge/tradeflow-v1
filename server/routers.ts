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
import { users } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { generateQuotePDF, generatePurchaseOrderPDF } from "./pdf";
import { sendPurchaseOrderEmail } from "./email";
import * as customAuth from "./customAuth";
import * as admin from "./admin";
import { SignJWT } from "jose";

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

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
    throw new Error("Admin access required");
  }
  return next({ ctx });
});

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
  admin: router({
    getAllUsers: adminProcedure.query(async ({ ctx }) => {
      const allUsers = await admin.getAllUsers();
      return allUsers.map(user => ({
        ...user,
        daysRemaining: admin.calculateDaysRemaining(user.subscriptionEndDate),
      }));
    }),

    inviteUser: adminProcedure
      .input(z.object({
        email: z.string().email(),
        subscriptionType: z.enum(["monthly", "annual", "indefinite"]),
      }))
      .mutation(async ({ input, ctx }) => {
        const { token, inviteUrl } = await admin.createUserInvitation(
          input.email,
          input.subscriptionType,
          ctx.user.id
        );
        return { success: true, inviteUrl, token };
      }),

    updateSubscription: adminProcedure
      .input(z.object({
        userId: z.number(),
        subscriptionType: z.enum(["monthly", "annual", "indefinite"]),
        subscriptionStatus: z.enum(["active", "expired", "cancelled"]),
      }))
      .mutation(async ({ input, ctx }) => {
        await admin.updateUserSubscription(
          input.userId,
          input.subscriptionType,
          input.subscriptionStatus
        );
        return { success: true };
      }),

    extendSubscription: adminProcedure
      .input(z.object({
        userId: z.number(),
        days: z.number().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        await admin.extendSubscription(input.userId, input.days);
        return { success: true };
      }),

    getPendingInvitations: adminProcedure.query(async ({ ctx }) => {
      return await admin.getPendingInvitations();
    }),

    deleteUser: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const database = await getDb();
        if (!database) throw new Error("Database not available");
        
        await database.delete(users).where(eq(users.id, input.userId));
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
          // TODO: Send email with reset link containing token
          console.log(`[Password Reset] Token for ${input.email}: ${token}`);
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
    me: publicProcedure.query(opts => opts.ctx.user),
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
    list: orgProcedure.query(async ({ ctx }) => {
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
      .input(z.object({
        quoteId: z.number(),
        pricelistItemId: z.number(),
        quantity: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Get pricelist item details
        const allItems = await dbHelpers.getAllPricelistItems(ctx.organizationId);
        const pricelistItem = allItems.find(item => item.id === input.pricelistItemId);
        
        if (!pricelistItem) {
          throw new Error("Pricelist item not found");
        }
        
        const sellPrice = parseFloat(pricelistItem.sellPrice || pricelistItem.rrpExGst || "0");
        const buyPrice = parseFloat(pricelistItem.looseBuyPrice || "0");
        const lineTotal = sellPrice * input.quantity;
        const margin = (sellPrice - buyPrice) * input.quantity;
        
        // Create quote item
        const item = await dbHelpers.createQuoteItem({
          quoteId: input.quoteId,
          pricelistItemId: input.pricelistItemId,
          itemName: pricelistItem.itemName,
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
        
        items.forEach(item => {
          totalAmount += parseFloat(item.lineTotal);
          totalMargin += parseFloat(item.margin);
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
        // Generate PO number
        const allPOs = await dbHelpers.getAllPurchaseOrders(ctx.organizationId);
        const poNumber = `PO${String(allPOs.length + 1).padStart(5, '0')}`;
        
        return await dbHelpers.createPurchaseOrder({
          supplierId: input.supplierId,
          poNumber,
          notes: input.notes || null,
          organizationId: ctx.organizationId,
        });
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
      .input(z.object({
        purchaseOrderId: z.number(),
        pricelistItemId: z.number(),
        quantity: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Get pricelist item details
        const allItems = await dbHelpers.getAllPricelistItems(ctx.organizationId);
        const pricelistItem = allItems.find(item => item.id === input.pricelistItemId);
        
        if (!pricelistItem) {
          throw new Error("Pricelist item not found");
        }
        
        const buyPrice = parseFloat(pricelistItem.looseBuyPrice || "0");
        const lineTotal = buyPrice * input.quantity;
        
        // Create PO item
        const item = await dbHelpers.createPurchaseOrderItem({
          purchaseOrderId: input.purchaseOrderId,
          pricelistItemId: input.pricelistItemId,
          itemName: pricelistItem.itemName,
          quantity: input.quantity.toString(),
          buyPrice: buyPrice.toString(),
          lineTotal: lineTotal.toString(),
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
        
        // Decode base64 to buffer
        const buffer = Buffer.from(input.fileData, "base64");
        
        // Generate unique filename
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(7);
        const fileExtension = input.fileName.split(".").pop();
        const fileKey = `company-logos/logo-${timestamp}-${randomSuffix}.${fileExtension}`;
        
        // Upload to S3
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        
        // Update company settings with new logo URL
        await dbHelpers.upsertCompanySettings(ctx.organizationId, { logoUrl: url });
        
        return { url };
      }),
  }),

  contact: router({
    list: adminProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      return await db.select().from(contactInquiries).orderBy(contactInquiries.createdAt);
    }),

    updateStatus: adminProcedure
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

    delete: adminProcedure
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
            title: "New Contact Form Submission",
            content: `Name: ${input.name}\nEmail: ${input.email}${input.company ? `\nCompany: ${input.company}` : ""}\n\nMessage:\n${input.message}`,
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
      .input(z.object({ name: z.string().min(1) }))
      .mutation(async ({ input }) => {
        return dbHelpers.createOrganization(input.name);
      }),
  }),

  // Organization Users router (for org owners to manage their team)
  organizationUsers: router({
    list: orgOwnerProcedure.query(async ({ ctx }) => {
      return dbHelpers.getUsersByOrganization(ctx.organizationId);
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

        // Create new user
        await db.insert(users).values({
          email: input.email,
          name: input.name,
          role: input.role,
          organizationId: ctx.organizationId,
          loginMethod: "email",
          status: "pending",
        });

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

    resetPassword: orgOwnerProcedure
      .input(z.object({
        userId: z.number(),
        newPassword: z.string().min(8),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        // Verify user belongs to the same organization
        const targetUser = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
        if (targetUser.length === 0 || targetUser[0].organizationId !== ctx.organizationId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Cannot modify user from different organization" });
        }

        // Hash password (you'll need to import bcrypt or similar)
        const bcrypt = require("bcrypt");
        const passwordHash = await bcrypt.hash(input.newPassword, 10);
        
        await db.update(users).set({ passwordHash }).where(eq(users.id, input.userId));
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

    assignToOrganization: superAdminProcedure
      .input(z.object({ 
        userId: z.number(), 
        organizationId: z.number() 
      }))
      .mutation(async ({ input }) => {
        await dbHelpers.assignUserToOrganization(input.userId, input.organizationId);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
