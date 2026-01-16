import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as dbHelpers from "./db";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { generateQuotePDF, generatePurchaseOrderPDF } from "./pdf";
import { sendPurchaseOrderEmail } from "./email";
import * as customAuth from "./customAuth";
import * as admin from "./admin";
import { SignJWT } from "jose";

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
  if (ctx.user.role !== "admin") {
    throw new Error("Admin access required");
  }
  return next({ ctx });
});

export const appRouter = router({
  admin: router({
    getAllUsers: adminProcedure.query(async () => {
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
      .mutation(async ({ input }) => {
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
      .mutation(async ({ input }) => {
        await admin.extendSubscription(input.userId, input.days);
        return { success: true };
      }),

    getPendingInvitations: adminProcedure.query(async () => {
      return await admin.getPendingInvitations();
    }),

    deleteUser: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
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
      .mutation(async ({ input }) => {
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
      .mutation(async ({ input }) => {
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
      .mutation(async ({ input }) => {
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
    list: protectedProcedure.query(async () => {
      return await dbHelpers.getAllPricelists();
    }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await dbHelpers.getPricelistById(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({ name: z.string().min(1) }))
      .mutation(async ({ input }) => {
        return await dbHelpers.createPricelist(input.name);
      }),
    
    update: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string().min(1) }))
      .mutation(async ({ input }) => {
        await dbHelpers.updatePricelist(input.id, input.name);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await dbHelpers.deletePricelist(input.id);
        return { success: true };
      }),
  }),

  pricelistItems: router({
    list: protectedProcedure
      .input(z.object({ pricelistId: z.number() }))
      .query(async ({ input }) => {
        return await dbHelpers.getPricelistItems(input.pricelistId);
      }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await dbHelpers.getPricelistItemById(input.id);
      }),
    
    uploadCSV: protectedProcedure
      .input(z.object({
        pricelistId: z.number(),
        csvData: z.array(z.record(z.string(), z.string())),
      }))
      .mutation(async ({ input }) => {
        const errors: string[] = [];
        const validItems: Array<Parameters<typeof dbHelpers.createPricelistItem>[0]> = [];

        input.csvData.forEach((row, index) => {
          try {
            const validated = csvRowSchema.parse(row);
            
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
    
    update: protectedProcedure
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
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        const cleanUpdates: Record<string, string | null> = {};
        
        Object.entries(updates).forEach(([key, value]) => {
          if (value !== undefined) {
            cleanUpdates[key] = value || null;
          }
        });

        await dbHelpers.updatePricelistItem(id, cleanUpdates);
        return { success: true };
      }),
    
    bulkUpdate: protectedProcedure
      .input(z.object({
        updates: z.array(z.object({
          id: z.number(),
          sellPrice: z.string(),
        })),
      }))
      .mutation(async ({ input }) => {
        for (const update of input.updates) {
          await dbHelpers.updatePricelistItem(update.id, { sellPrice: update.sellPrice });
        }
        return { success: true, updatedCount: input.updates.length };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await dbHelpers.deletePricelistItem(input.id);
        return { success: true };
      }),
  }),

  customers: router({
    list: protectedProcedure.query(async () => {
      return await dbHelpers.getAllCustomers();
    }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await dbHelpers.getCustomerById(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        companyName: z.string().min(1),
        contactName: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().optional(),
        billingAddress: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await dbHelpers.createCustomer({
          ...input,
          email: input.email || null,
          contactName: input.contactName || null,
          phone: input.phone || null,
          billingAddress: input.billingAddress || null,
          notes: input.notes || null,
        });
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        companyName: z.string().min(1).optional(),
        contactName: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().optional(),
        billingAddress: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        const cleanUpdates: Record<string, string | null> = {};
        
        Object.entries(updates).forEach(([key, value]) => {
          if (value !== undefined) {
            cleanUpdates[key] = value || null;
          }
        });

        await dbHelpers.updateCustomer(id, cleanUpdates);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await dbHelpers.deleteCustomer(input.id);
        return { success: true };
      }),
  }),

  quotes: router({
    list: protectedProcedure.query(async () => {
      return await dbHelpers.getAllQuotes();
    }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await dbHelpers.getQuoteById(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        customerId: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Generate quote number
        const allQuotes = await dbHelpers.getAllQuotes();
        const quoteNumber = `Q${String(allQuotes.length + 1).padStart(5, '0')}`;
        
        return await dbHelpers.createQuote({
          customerId: input.customerId,
          quoteNumber,
          notes: input.notes || null,
        });
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["draft", "sent", "accepted", "rejected"]).optional(),
        notes: z.string().optional(),
        pdfUrl: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        const cleanUpdates: Record<string, string | null> = {};
        
        Object.entries(updates).forEach(([key, value]) => {
          if (value !== undefined) {
            cleanUpdates[key] = value || null;
          }
        });

        await dbHelpers.updateQuote(id, cleanUpdates);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await dbHelpers.deleteQuote(input.id);
        return { success: true };
      }),
    
    recalculateTotals: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const items = await dbHelpers.getQuoteItems(input.id);
        
        let totalAmount = 0;
        let totalMargin = 0;
        
        items.forEach(item => {
          totalAmount += parseFloat(item.lineTotal);
          totalMargin += parseFloat(item.margin);
        });
        
        const marginPercentage = totalAmount > 0 ? (totalMargin / totalAmount) * 100 : 0;
        
        await dbHelpers.updateQuote(input.id, {
          totalAmount: totalAmount.toFixed(2),
          totalMargin: totalMargin.toFixed(2),
          marginPercentage: marginPercentage.toFixed(2),
        });
        
        return { success: true };
      }),
    
    generatePDF: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const url = await generateQuotePDF(input.id);
        return { url };
      }),
  }),

  quoteItems: router({
    list: protectedProcedure
      .input(z.object({ quoteId: z.number() }))
      .query(async ({ input }) => {
        return await dbHelpers.getQuoteItems(input.quoteId);
      }),
    
    create: protectedProcedure
      .input(z.object({
        quoteId: z.number(),
        pricelistItemId: z.number().optional(),
        itemName: z.string(),
        quantity: z.number(),
        sellPrice: z.number(),
        buyPrice: z.number(),
      }))
      .mutation(async ({ input }) => {
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
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        quantity: z.number().optional(),
        sellPrice: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        
        // Get current item to recalculate
        const items = await dbHelpers.getQuoteItems(0);
        const currentItem = items.find(i => i.id === id);
        
        if (currentItem) {
          const quantity = updates.quantity ?? parseFloat(currentItem.quantity);
          const sellPrice = updates.sellPrice ?? parseFloat(currentItem.sellPrice);
          const buyPrice = parseFloat(currentItem.buyPrice);
          
          const lineTotal = sellPrice * quantity;
          const margin = (sellPrice - buyPrice) * quantity;
          
          await dbHelpers.updateQuoteItem(id, {
            quantity: quantity.toFixed(2),
            sellPrice: sellPrice.toFixed(2),
            margin: margin.toFixed(2),
            lineTotal: lineTotal.toFixed(2),
          });
        }
        
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await dbHelpers.deleteQuoteItem(input.id);
        return { success: true };
      }),
  }),

  purchaseOrders: router({
    list: protectedProcedure.query(async () => {
      return await dbHelpers.getAllPurchaseOrders();
    }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await dbHelpers.getPurchaseOrderById(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        supplierId: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Generate PO number
        const allPOs = await dbHelpers.getAllPurchaseOrders();
        const poNumber = `PO${String(allPOs.length + 1).padStart(5, '0')}`;
        
        return await dbHelpers.createPurchaseOrder({
          supplierId: input.supplierId,
          poNumber,
          notes: input.notes || null,
        });
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["draft", "sent", "received", "cancelled"]).optional(),
        notes: z.string().optional(),
        pdfUrl: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        const cleanUpdates: Record<string, string | null> = {};
        
        Object.entries(updates).forEach(([key, value]) => {
          if (value !== undefined) {
            cleanUpdates[key] = value || null;
          }
        });

        await dbHelpers.updatePurchaseOrder(id, cleanUpdates);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await dbHelpers.deletePurchaseOrder(input.id);
        return { success: true };
      }),
    
    recalculateTotals: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const items = await dbHelpers.getPurchaseOrderItems(input.id);
        
        let totalAmount = 0;
        
        items.forEach(item => {
          totalAmount += parseFloat(item.lineTotal);
        });
        
        await dbHelpers.updatePurchaseOrder(input.id, {
          totalAmount: totalAmount.toFixed(2),
        });
        
        return { success: true };
      }),
    
    generatePDF: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const url = await generatePurchaseOrderPDF(input.id);
        return { url };
      }),
    
    sendEmail: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await sendPurchaseOrderEmail(input.id);
        return { success: true };
      }),
  }),

  purchaseOrderItems: router({
    list: protectedProcedure
      .input(z.object({ purchaseOrderId: z.number() }))
      .query(async ({ input }) => {
        return await dbHelpers.getPurchaseOrderItems(input.purchaseOrderId);
      }),
    
    create: protectedProcedure
      .input(z.object({
        purchaseOrderId: z.number(),
        pricelistItemId: z.number().optional(),
        itemName: z.string(),
        quantity: z.number(),
        buyPrice: z.number(),
      }))
      .mutation(async ({ input }) => {
        const lineTotal = input.buyPrice * input.quantity;
        
        const item = await dbHelpers.createPurchaseOrderItem({
          purchaseOrderId: input.purchaseOrderId,
          pricelistItemId: input.pricelistItemId || null,
          itemName: input.itemName,
          quantity: input.quantity.toFixed(2),
          buyPrice: input.buyPrice.toFixed(2),
          lineTotal: lineTotal.toFixed(2),
        });
        
        return item;
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        quantity: z.number().optional(),
        buyPrice: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        
        // Get current item to recalculate
        const items = await dbHelpers.getPurchaseOrderItems(0);
        const currentItem = items.find(i => i.id === id);
        
        if (currentItem) {
          const quantity = updates.quantity ?? parseFloat(currentItem.quantity);
          const buyPrice = updates.buyPrice ?? parseFloat(currentItem.buyPrice);
          
          const lineTotal = buyPrice * quantity;
          
          await dbHelpers.updatePurchaseOrderItem(id, {
            quantity: quantity.toFixed(2),
            buyPrice: buyPrice.toFixed(2),
            lineTotal: lineTotal.toFixed(2),
          });
        }
        
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await dbHelpers.deletePurchaseOrderItem(input.id);
        return { success: true };
      }),
  }),

  suppliers: router({
    list: protectedProcedure.query(async () => {
      return await dbHelpers.getAllSuppliers();
    }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await dbHelpers.getSupplierById(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        companyName: z.string().min(1),
        billingAddress: z.string().optional(),
        keyContactName: z.string().optional(),
        keyContactEmail: z.string().email().optional().or(z.literal("")),
        poEmail: z.string().email(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await dbHelpers.createSupplier({
          ...input,
          billingAddress: input.billingAddress || null,
          keyContactName: input.keyContactName || null,
          keyContactEmail: input.keyContactEmail || null,
          notes: input.notes || null,
        });
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        companyName: z.string().min(1).optional(),
        billingAddress: z.string().optional(),
        keyContactName: z.string().optional(),
        keyContactEmail: z.string().email().optional().or(z.literal("")),
        poEmail: z.string().email().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        const cleanUpdates: Record<string, string | null> = {};
        
        Object.entries(updates).forEach(([key, value]) => {
          if (value !== undefined) {
            cleanUpdates[key] = value || null;
          }
        });

        await dbHelpers.updateSupplier(id, cleanUpdates);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await dbHelpers.deleteSupplier(input.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
