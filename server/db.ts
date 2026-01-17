import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users,
  organizations,
  pricelists,
  pricelistItems,
  customers,
  suppliers,
  quotes,
  quoteItems,
  purchaseOrders,
  purchaseOrderItems,
  type User,
  type Organization,
  type Pricelist,
  type PricelistItem,
  type Customer,
  type Supplier,
  type Quote,
  type QuoteItem,
  type PurchaseOrder,
  type PurchaseOrderItem,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId && !user.email) {
    throw new Error("Either openId or email is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
      email: user.email || user.openId || "temp@example.com", // Temporary fallback
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      // Email field is required, don't update if null
      if (field === "email" && !value) return;
      const normalized = value ?? null;
      values[field] = normalized as any;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Pricelist queries
export async function getAllPricelists(organizationId: number): Promise<Pricelist[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pricelists).where(eq(pricelists.organizationId, organizationId)).orderBy(desc(pricelists.createdAt));
}

export async function getPricelistById(id: number, organizationId: number): Promise<Pricelist | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(pricelists).where(and(eq(pricelists.id, id), eq(pricelists.organizationId, organizationId))).limit(1);
  return result[0];
}

export async function createPricelist(name: string, organizationId: number): Promise<Pricelist> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(pricelists).values({ name, organizationId });
  const insertedId = Number(result[0].insertId);
  const created = await getPricelistById(insertedId, organizationId);
  if (!created) throw new Error("Failed to retrieve created pricelist");
  return created;
}

export async function updatePricelist(id: number, organizationId: number, name: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(pricelists).set({ name }).where(and(eq(pricelists.id, id), eq(pricelists.organizationId, organizationId)));
}

export async function deletePricelist(id: number, organizationId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete associated items first
  await db.delete(pricelistItems).where(and(eq(pricelistItems.pricelistId, id), eq(pricelistItems.organizationId, organizationId)));
  await db.delete(pricelists).where(and(eq(pricelists.id, id), eq(pricelists.organizationId, organizationId)));
}

// Pricelist item queries
export async function getPricelistItems(pricelistId: number, organizationId: number): Promise<PricelistItem[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pricelistItems).where(and(eq(pricelistItems.pricelistId, pricelistId), eq(pricelistItems.organizationId, organizationId)));
}

export async function getAllPricelistItems(organizationId: number): Promise<PricelistItem[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pricelistItems).where(eq(pricelistItems.organizationId, organizationId));
}

export async function getPricelistItemById(id: number, organizationId: number): Promise<PricelistItem | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(pricelistItems).where(and(eq(pricelistItems.id, id), eq(pricelistItems.organizationId, organizationId))).limit(1);
  return result[0];
}

export async function createPricelistItem(item: typeof pricelistItems.$inferInsert): Promise<PricelistItem> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(pricelistItems).values(item);
  const insertedId = Number(result[0].insertId);
  const created = await getPricelistItemById(insertedId, item.organizationId);
  if (!created) throw new Error("Failed to retrieve created item");
  return created;
}

export async function bulkCreatePricelistItems(items: typeof pricelistItems.$inferInsert[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (items.length === 0) return;
  await db.insert(pricelistItems).values(items);
}

export async function updatePricelistItem(id: number, organizationId: number, updates: Partial<typeof pricelistItems.$inferInsert>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(pricelistItems).set(updates).where(and(eq(pricelistItems.id, id), eq(pricelistItems.organizationId, organizationId)));
}

export async function deletePricelistItem(id: number, organizationId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(pricelistItems).where(and(eq(pricelistItems.id, id), eq(pricelistItems.organizationId, organizationId)));
}

// Customer queries
export async function getAllCustomers(organizationId: number): Promise<Customer[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(customers).where(eq(customers.organizationId, organizationId)).orderBy(desc(customers.createdAt));
}

export async function getCustomerById(id: number, organizationId: number): Promise<Customer | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(customers).where(and(eq(customers.id, id), eq(customers.organizationId, organizationId))).limit(1);
  return result[0];
}

export async function createCustomer(customer: typeof customers.$inferInsert): Promise<Customer> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(customers).values(customer);
  const insertedId = Number(result[0].insertId);
  const created = await getCustomerById(insertedId, customer.organizationId);
  if (!created) throw new Error("Failed to retrieve created customer");
  return created;
}

export async function updateCustomer(id: number, organizationId: number, updates: Partial<typeof customers.$inferInsert>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(customers).set(updates).where(and(eq(customers.id, id), eq(customers.organizationId, organizationId)));
}

export async function deleteCustomer(id: number, organizationId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(customers).where(and(eq(customers.id, id), eq(customers.organizationId, organizationId)));
}

// Supplier queries
export async function getAllSuppliers(organizationId: number): Promise<Supplier[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(suppliers).where(eq(suppliers.organizationId, organizationId)).orderBy(desc(suppliers.createdAt));
}

export async function getSupplierById(id: number, organizationId: number): Promise<Supplier | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(suppliers).where(and(eq(suppliers.id, id), eq(suppliers.organizationId, organizationId))).limit(1);
  return result[0];
}

export async function createSupplier(supplier: typeof suppliers.$inferInsert): Promise<Supplier> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(suppliers).values(supplier);
  const insertedId = Number(result[0].insertId);
  const created = await getSupplierById(insertedId, supplier.organizationId);
  if (!created) throw new Error("Failed to retrieve created supplier");
  return created;
}

export async function updateSupplier(id: number, organizationId: number, updates: Partial<typeof suppliers.$inferInsert>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(suppliers).set(updates).where(and(eq(suppliers.id, id), eq(suppliers.organizationId, organizationId)));
}

export async function deleteSupplier(id: number, organizationId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(suppliers).where(and(eq(suppliers.id, id), eq(suppliers.organizationId, organizationId)));
}

// Quote queries
export async function getAllQuotes(organizationId: number): Promise<Quote[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quotes).where(eq(quotes.organizationId, organizationId)).orderBy(desc(quotes.createdAt));
}

export async function getQuotesByCustomer(customerId: number, organizationId: number): Promise<Quote[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quotes).where(and(eq(quotes.customerId, customerId), eq(quotes.organizationId, organizationId))).orderBy(desc(quotes.createdAt));
}

export async function getQuoteById(id: number, organizationId: number): Promise<(Quote & { items: QuoteItem[] }) | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const quoteResult = await db.select().from(quotes).where(and(eq(quotes.id, id), eq(quotes.organizationId, organizationId))).limit(1);
  if (!quoteResult[0]) return undefined;
  
  const items = await db.select().from(quoteItems).where(eq(quoteItems.quoteId, id));
  return { ...quoteResult[0], items };
}

export async function createQuote(quote: typeof quotes.$inferInsert): Promise<Quote> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(quotes).values(quote);
  const insertedId = Number(result[0].insertId);
  const created = await getQuoteById(insertedId, quote.organizationId);
  if (!created) throw new Error("Failed to retrieve created quote");
  return created;
}

export async function updateQuote(id: number, organizationId: number, updates: Partial<typeof quotes.$inferInsert>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(quotes).set(updates).where(and(eq(quotes.id, id), eq(quotes.organizationId, organizationId)));
}

export async function deleteQuote(id: number, organizationId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(quoteItems).where(eq(quoteItems.quoteId, id));
  await db.delete(quotes).where(and(eq(quotes.id, id), eq(quotes.organizationId, organizationId)));
}

// Quote item queries
export async function getQuoteItems(quoteId: number): Promise<QuoteItem[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quoteItems).where(eq(quoteItems.quoteId, quoteId));
}

export async function createQuoteItem(item: typeof quoteItems.$inferInsert): Promise<QuoteItem> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(quoteItems).values(item);
  const insertedId = Number(result[0].insertId);
  const created = await db.select().from(quoteItems).where(eq(quoteItems.id, insertedId)).limit(1);
  if (!created[0]) throw new Error("Failed to retrieve created quote item");
  return created[0];
}

export async function updateQuoteItem(id: number, updates: Partial<typeof quoteItems.$inferInsert>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(quoteItems).set(updates).where(eq(quoteItems.id, id));
}

export async function deleteQuoteItem(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(quoteItems).where(eq(quoteItems.id, id));
}

// Purchase order queries
export async function getAllPurchaseOrders(organizationId: number): Promise<PurchaseOrder[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(purchaseOrders).where(eq(purchaseOrders.organizationId, organizationId)).orderBy(desc(purchaseOrders.createdAt));
}

export async function getPurchaseOrdersBySupplier(supplierId: number, organizationId: number): Promise<PurchaseOrder[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(purchaseOrders).where(and(eq(purchaseOrders.supplierId, supplierId), eq(purchaseOrders.organizationId, organizationId))).orderBy(desc(purchaseOrders.createdAt));
}

export async function getPurchaseOrderById(id: number, organizationId: number): Promise<(PurchaseOrder & { items: PurchaseOrderItem[] }) | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const poResult = await db.select().from(purchaseOrders).where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.organizationId, organizationId))).limit(1);
  if (!poResult[0]) return undefined;
  
  const items = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, id));
  return { ...poResult[0], items };
}

export async function createPurchaseOrder(po: typeof purchaseOrders.$inferInsert): Promise<PurchaseOrder> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(purchaseOrders).values(po);
  const insertedId = Number(result[0].insertId);
  const created = await getPurchaseOrderById(insertedId, po.organizationId);
  if (!created) throw new Error("Failed to retrieve created purchase order");
  return created;
}

export async function updatePurchaseOrder(id: number, organizationId: number, updates: Partial<typeof purchaseOrders.$inferInsert>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(purchaseOrders).set(updates).where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.organizationId, organizationId)));
}

export async function deletePurchaseOrder(id: number, organizationId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, id));
  await db.delete(purchaseOrders).where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.organizationId, organizationId)));
}

// Purchase order item queries
export async function getPurchaseOrderItems(purchaseOrderId: number): Promise<PurchaseOrderItem[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, purchaseOrderId));
}

export async function createPurchaseOrderItem(item: typeof purchaseOrderItems.$inferInsert): Promise<PurchaseOrderItem> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(purchaseOrderItems).values(item);
  const insertedId = Number(result[0].insertId);
  const created = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.id, insertedId)).limit(1);
  if (!created[0]) throw new Error("Failed to retrieve created purchase order item");
  return created[0];
}

export async function updatePurchaseOrderItem(id: number, updates: Partial<typeof purchaseOrderItems.$inferInsert>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(purchaseOrderItems).set(updates).where(eq(purchaseOrderItems.id, id));
}

export async function deletePurchaseOrderItem(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.id, id));
}

// Company Settings
export async function getCompanySettings(organizationId: number): Promise<typeof companySettings.$inferSelect | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { companySettings } = await import("../drizzle/schema");
  const settings = await db.select().from(companySettings).where(eq(companySettings.organizationId, organizationId)).limit(1);
  return settings[0] || null;
}

export async function upsertCompanySettings(organizationId: number, settings: Partial<typeof companySettings.$inferInsert>): Promise<typeof companySettings.$inferSelect> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { companySettings } = await import("../drizzle/schema");
  
  const existing = await db.select().from(companySettings).where(eq(companySettings.organizationId, organizationId)).limit(1);
  
  if (existing.length > 0) {
    // Update existing
    await db.update(companySettings).set(settings).where(eq(companySettings.id, existing[0].id));
    const updated = await db.select().from(companySettings).where(eq(companySettings.id, existing[0].id)).limit(1);
    return updated[0];
  } else {
    // Insert new
    const result = await db.insert(companySettings).values({ ...settings, organizationId });
    const insertedId = Number(result[0].insertId);
    const created = await db.select().from(companySettings).where(eq(companySettings.id, insertedId)).limit(1);
    return created[0];
  }
}

// Organization queries
export async function getAllOrganizations(): Promise<Organization[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(organizations).orderBy(desc(organizations.createdAt));
}

export async function getOrganizationById(id: number): Promise<Organization | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(organizations).where(eq(organizations.id, id));
  return result[0];
}

export async function createOrganization(name: string): Promise<Organization> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(organizations).values({ name });
  const insertId = Number(result[0].insertId);
  const created = await getOrganizationById(insertId);
  if (!created) throw new Error("Failed to create organization");
  return created;
}

// User queries
export async function getAllUsers(): Promise<User[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function assignUserToOrganization(userId: number, organizationId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ organizationId }).where(eq(users.id, userId));
}

export async function getUsersByOrganization(organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(users).where(eq(users.organizationId, organizationId));
}
