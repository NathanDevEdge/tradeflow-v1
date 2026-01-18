import { desc } from "drizzle-orm";
import { getDb } from "./db";
import { users } from "../drizzle/schema";

/**
 * Get all users with subscription information
 */
export async function getAllUsers() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const allUsers = await db
    .select()
    .from(users)
    .orderBy(desc(users.createdAt));

  return allUsers;
}

// All other admin functions removed - subscriptions now managed at organization level in Super Admin panel
