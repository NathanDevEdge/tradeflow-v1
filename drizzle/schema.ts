import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, index } from "drizzle-orm/mysql-core";

/**
 * Organizations table for multi-tenancy
 */
export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

/**
 * Core user table supporting dual authentication:
 * - OAuth (openId) for admin access
 * - Email/password for customer access
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(), // For admin OAuth login
  email: varchar("email", { length: 320 }).notNull().unique(), // For customer email/password login
  passwordHash: varchar("passwordHash", { length: 255 }), // Null for OAuth users
  name: text("name"),
  loginMethod: varchar("loginMethod", { length: 64 }), // 'oauth' or 'email'
  role: mysqlEnum("role", ["user", "org_owner", "admin", "super_admin"]).default("user").notNull(),
  status: mysqlEnum("status", ["active", "inactive", "pending"]).default("active").notNull(),
  subscriptionType: mysqlEnum("subscriptionType", ["monthly", "annual", "indefinite"]),
  subscriptionEndDate: timestamp("subscriptionEndDate"),
  subscriptionStatus: mysqlEnum("subscriptionStatus", ["active", "expired", "cancelled"]).default("active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn"),
  organizationId: int("organizationId"),
}, (table) => ({
  organizationIdx: index("organization_idx").on(table.organizationId),
}));

/**
 * Password reset tokens for email/password users
 */
export const passwordResetTokens = mysqlTable("password_reset_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  used: int("used").default(0).notNull(), // 0 = unused, 1 = used
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const contactInquiries = mysqlTable("contact_inquiries", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  company: varchar("company", { length: 255 }),
  message: text("message").notNull(),
  status: mysqlEnum("status", ["new", "contacted", "converted", "archived"]).default("new").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContactInquiry = typeof contactInquiries.$inferSelect;
export type InsertContactInquiry = typeof contactInquiries.$inferInsert;

/**
 * Company settings for branding and business details
 * Single row table - only one company settings record
 */
export const companySettings = mysqlTable("company_settings", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().unique(),
  companyName: varchar("company_name", { length: 255 }),
  abn: varchar("abn", { length: 50 }),
  address: text("address"),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 320 }),
  logoUrl: text("logo_url"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CompanySettings = typeof companySettings.$inferSelect;
export type InsertCompanySettings = typeof companySettings.$inferInsert;

/**
 * User invitations table for admin-generated accounts
 */
export const userInvitations = mysqlTable("user_invitations", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  invitedBy: int("invitedBy").notNull(), // Admin user ID
  subscriptionType: mysqlEnum("subscriptionType", ["monthly", "annual", "indefinite"]).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  used: int("used").default(0).notNull(), // 0 = unused, 1 = used
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserInvitation = typeof userInvitations.$inferSelect;
export type InsertUserInvitation = typeof userInvitations.$inferInsert;

/**
 * Password reset tokens for email/password users
 */
export const pricelists = mysqlTable("pricelists", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  organizationId: int("organizationId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  organizationIdx: index("pricelist_organization_idx").on(table.organizationId),
}));

export type Pricelist = typeof pricelists.$inferSelect;
export type InsertPricelist = typeof pricelists.$inferInsert;

/**
 * Pricelist items - individual products with pricing
 * CSV columns: Item Name, SKU Code, Pack Size, Pack buy price ex gst, Loose buy price ex gst, RRP ex gst, RRP inc gst
 * Required fields: Item Name, Loose buy price ex gst, RRP ex gst
 */
export const pricelistItems = mysqlTable("pricelist_items", {
  id: int("id").autoincrement().primaryKey(),
  pricelistId: int("pricelistId").notNull(),
  organizationId: int("organizationId").notNull(),
  itemName: varchar("itemName", { length: 500 }).notNull(),
  skuCode: varchar("skuCode", { length: 100 }),
  packSize: varchar("packSize", { length: 100 }),
  packBuyPrice: decimal("packBuyPrice", { precision: 10, scale: 2 }),
  looseBuyPrice: decimal("looseBuyPrice", { precision: 10, scale: 2 }).notNull(), // Required - used for all purchase calculations
  rrpExGst: decimal("rrpExGst", { precision: 10, scale: 2 }).notNull(), // Required
  rrpIncGst: decimal("rrpIncGst", { precision: 10, scale: 2 }),
  sellPrice: decimal("sellPrice", { precision: 10, scale: 2 }).notNull(), // Defaults to rrpExGst, editable
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PricelistItem = typeof pricelistItems.$inferSelect;
export type InsertPricelistItem = typeof pricelistItems.$inferInsert;

/**
 * Customers - companies that receive quotes
 */
export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  companyName: varchar("companyName", { length: 255 }).notNull(),
  contactName: varchar("contactName", { length: 255 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  billingAddress: text("billingAddress"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

/**
 * Suppliers - companies that receive purchase orders
 */
export const suppliers = mysqlTable("suppliers", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  companyName: varchar("companyName", { length: 255 }).notNull(),
  billingAddress: text("billingAddress"),
  keyContactName: varchar("keyContactName", { length: 255 }),
  keyContactEmail: varchar("keyContactEmail", { length: 320 }),
  poEmail: varchar("poEmail", { length: 320 }).notNull(), // Email address for sending POs
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = typeof suppliers.$inferInsert;

/**
 * Quotes - customer-facing price proposals with margin tracking
 */
export const quotes = mysqlTable("quotes", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  customerId: int("customerId").notNull(),
  quoteNumber: varchar("quoteNumber", { length: 50 }).notNull().unique(),
  status: mysqlEnum("status", ["draft", "sent", "accepted", "declined"]).default("draft").notNull(),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull().default("0"),
  totalMargin: decimal("totalMargin", { precision: 10, scale: 2 }).notNull().default("0"),
  marginPercentage: decimal("marginPercentage", { precision: 5, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  pdfUrl: varchar("pdfUrl", { length: 500 }), // S3 URL for generated PDF
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = typeof quotes.$inferInsert;

/**
 * Quote items - line items in a quote with margin calculations
 */
export const quoteItems = mysqlTable("quote_items", {
  id: int("id").autoincrement().primaryKey(),
  quoteId: int("quoteId").notNull(),
  pricelistItemId: int("pricelistItemId"), // Optional reference to pricelist item
  itemName: varchar("itemName", { length: 500 }).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  sellPrice: decimal("sellPrice", { precision: 10, scale: 2 }).notNull(),
  buyPrice: decimal("buyPrice", { precision: 10, scale: 2 }).notNull(), // Loose buy price ex GST
  margin: decimal("margin", { precision: 10, scale: 2 }).notNull(), // (sellPrice - buyPrice) * quantity
  lineTotal: decimal("lineTotal", { precision: 10, scale: 2 }).notNull(), // sellPrice * quantity
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type QuoteItem = typeof quoteItems.$inferSelect;
export type InsertQuoteItem = typeof quoteItems.$inferInsert;

/**
 * Purchase orders - supplier-facing orders showing only buy prices
 */
export const purchaseOrders = mysqlTable("purchase_orders", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  supplierId: int("supplierId").notNull(),
  poNumber: varchar("poNumber", { length: 50 }).notNull().unique(),
  status: mysqlEnum("status", ["draft", "sent", "received", "cancelled"]).default("draft").notNull(),
  deliveryMethod: mysqlEnum("deliveryMethod", ["in_store_delivery", "pickup_from_supplier"]).default("pickup_from_supplier").notNull(),
  shippingAddress: text("shippingAddress"), // Only used when deliveryMethod is in_store_delivery
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  pdfUrl: varchar("pdfUrl", { length: 500 }), // S3 URL for generated PDF
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = typeof purchaseOrders.$inferInsert;

/**
 * Purchase order items - line items showing only buy prices
 */
export const purchaseOrderItems = mysqlTable("purchase_order_items", {
  id: int("id").autoincrement().primaryKey(),
  purchaseOrderId: int("purchaseOrderId").notNull(),
  pricelistItemId: int("pricelistItemId"), // Optional reference to pricelist item
  itemName: varchar("itemName", { length: 500 }).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  buyPrice: decimal("buyPrice", { precision: 10, scale: 2 }).notNull(), // Loose buy price ex GST
  lineTotal: decimal("lineTotal", { precision: 10, scale: 2 }).notNull(), // buyPrice * quantity
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type InsertPurchaseOrderItem = typeof purchaseOrderItems.$inferInsert;

/**
 * Shipping addresses - saved delivery addresses for purchase orders
 */
export const shippingAddresses = mysqlTable("shipping_addresses", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  attentionTo: varchar("attentionTo", { length: 255 }),
  streetAddress: text("streetAddress").notNull(),
  state: varchar("state", { length: 100 }),
  postcode: varchar("postcode", { length: 20 }),
  country: varchar("country", { length: 100 }).default("Australia").notNull(),
  phoneNumber: varchar("phoneNumber", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  organizationIdx: index("shipping_addresses_organization_idx").on(table.organizationId),
}));

export type ShippingAddress = typeof shippingAddresses.$inferSelect;
export type InsertShippingAddress = typeof shippingAddresses.$inferInsert;
