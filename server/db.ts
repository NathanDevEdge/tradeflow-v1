import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users,
  pricelists,
  pricelistItems,
  customers,
  suppliers,
  quotes,
  quoteItems,
  purchaseOrders,
  purchaseOrderItems,
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
export async function getAllPricelists(): Promise<Pricelist[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pricelists).orderBy(desc(pricelists.createdAt));
}

export async function getPricelistById(id: number): Promise<Pricelist | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(pricelists).where(eq(pricelists.id, id)).limit(1);
  return result[0];
}

export async function createPricelist(name: string): Promise<Pricelist> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(pricelists).values({ name });
  const insertedId = Number(result[0].insertId);
  const created = await getPricelistById(insertedId);
  if (!created) throw new Error("Failed to retrieve created pricelist");
  return created;
}

export async function updatePricelist(id: number, name: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(pricelists).set({ name }).where(eq(pricelists.id, id));
}

export async function deletePricelist(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete associated items first
  await db.delete(pricelistItems).where(eq(pricelistItems.pricelistId, id));
  await db.delete(pricelists).where(eq(pricelists.id, id));
}

// Pricelist item queries
export async function getPricelistItems(pricelistId: number): Promise<PricelistItem[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pricelistItems).where(eq(pricelistItems.pricelistId, pricelistId));
}

export async function getAllPricelistItems(): Promise<PricelistItem[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pricelistItems);
}

export async function getPricelistItemById(id: number): Promise<PricelistItem | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(pricelistItems).where(eq(pricelistItems.id, id)).limit(1);
  return result[0];
}

export async function createPricelistItem(item: typeof pricelistItems.$inferInsert): Promise<PricelistItem> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(pricelistItems).values(item);
  const insertedId = Number(result[0].insertId);
  const created = await getPricelistItemById(insertedId);
  if (!created) throw new Error("Failed to retrieve created item");
  return created;
}

export async function bulkCreatePricelistItems(items: typeof pricelistItems.$inferInsert[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (items.length === 0) return;
  await db.insert(pricelistItems).values(items);
}

export async function updatePricelistItem(id: number, updates: Partial<typeof pricelistItems.$inferInsert>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(pricelistItems).set(updates).where(eq(pricelistItems.id, id));
}

export async function deletePricelistItem(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(pricelistItems).where(eq(pricelistItems.id, id));
}

// Customer queries
export async function getAllCustomers(): Promise<Customer[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(customers).orderBy(desc(customers.createdAt));
}

export async function getCustomerById(id: number): Promise<Customer | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  return result[0];
}

export async function createCustomer(customer: typeof customers.$inferInsert): Promise<Customer> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(customers).values(customer);
  const insertedId = Number(result[0].insertId);
  const created = await getCustomerById(insertedId);
  if (!created) throw new Error("Failed to retrieve created customer");
  return created;
}

export async function updateCustomer(id: number, updates: Partial<typeof customers.$inferInsert>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(customers).set(updates).where(eq(customers.id, id));
}

export async function deleteCustomer(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(customers).where(eq(customers.id, id));
}

// Supplier queries
export async function getAllSuppliers(): Promise<Supplier[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(suppliers).orderBy(desc(suppliers.createdAt));
}

export async function getSupplierById(id: number): Promise<Supplier | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
  return result[0];
}

export async function createSupplier(supplier: typeof suppliers.$inferInsert): Promise<Supplier> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(suppliers).values(supplier);
  const insertedId = Number(result[0].insertId);
  const created = await getSupplierById(insertedId);
  if (!created) throw new Error("Failed to retrieve created supplier");
  return created;
}

export async function updateSupplier(id: number, updates: Partial<typeof suppliers.$inferInsert>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(suppliers).set(updates).where(eq(suppliers.id, id));
}

export async function deleteSupplier(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(suppliers).where(eq(suppliers.id, id));
}

// Quote queries
export async function getAllQuotes(): Promise<Quote[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quotes).orderBy(desc(quotes.createdAt));
}

export async function getQuoteById(id: number): Promise<(Quote & { items: QuoteItem[] }) | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const quoteResult = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1);
  if (!quoteResult[0]) return undefined;
  
  const items = await db.select().from(quoteItems).where(eq(quoteItems.quoteId, id));
  return { ...quoteResult[0], items };
}

export async function createQuote(quote: typeof quotes.$inferInsert): Promise<Quote> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(quotes).values(quote);
  const insertedId = Number(result[0].insertId);
  const created = await getQuoteById(insertedId);
  if (!created) throw new Error("Failed to retrieve created quote");
  return created;
}

export async function updateQuote(id: number, updates: Partial<typeof quotes.$inferInsert>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(quotes).set(updates).where(eq(quotes.id, id));
}

export async function deleteQuote(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(quoteItems).where(eq(quoteItems.quoteId, id));
  await db.delete(quotes).where(eq(quotes.id, id));
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
export async function getAllPurchaseOrders(): Promise<PurchaseOrder[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(purchaseOrders).orderBy(desc(purchaseOrders.createdAt));
}

export async function getPurchaseOrderById(id: number): Promise<(PurchaseOrder & { items: PurchaseOrderItem[] }) | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const poResult = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)).limit(1);
  if (!poResult[0]) return undefined;
  
  const items = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, id));
  return { ...poResult[0], items };
}

export async function createPurchaseOrder(po: typeof purchaseOrders.$inferInsert): Promise<PurchaseOrder> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(purchaseOrders).values(po);
  const insertedId = Number(result[0].insertId);
  const created = await getPurchaseOrderById(insertedId);
  if (!created) throw new Error("Failed to retrieve created purchase order");
  return created;
}

export async function updatePurchaseOrder(id: number, updates: Partial<typeof purchaseOrders.$inferInsert>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(purchaseOrders).set(updates).where(eq(purchaseOrders.id, id));
}

export async function deletePurchaseOrder(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, id));
  await db.delete(purchaseOrders).where(eq(purchaseOrders.id, id));
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
