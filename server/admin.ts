import { nanoid } from "nanoid";
import { getDb } from "./db";
import { users, userInvitations } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

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

/**
 * Calculate days remaining in subscription
 */
export function calculateDaysRemaining(subscriptionEndDate: Date | null): number | null {
  if (!subscriptionEndDate) return null;
  
  const now = new Date();
  const diffTime = subscriptionEndDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Create a user invitation
 */
export async function createUserInvitation(
  email: string,
  subscriptionType: "monthly" | "annual" | "indefinite",
  invitedBy: number
): Promise<{ token: string; inviteUrl: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if user already exists
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser.length > 0) {
    throw new Error("User with this email already exists");
  }

  // Check if there's an unused invitation
  const existingInvite = await db
    .select()
    .from(userInvitations)
    .where(and(eq(userInvitations.email, email), eq(userInvitations.used, 0)))
    .limit(1);

  if (existingInvite.length > 0) {
    throw new Error("An invitation has already been sent to this email");
  }

  const token = nanoid(32);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // Invitation expires in 7 days

  await db.insert(userInvitations).values({
    email,
    token,
    invitedBy,
    subscriptionType,
    expiresAt,
    used: 0,
  });

  const inviteUrl = `/register?token=${token}`;

  return { token, inviteUrl };
}

/**
 * Get invitation by token
 */
export async function getInvitationByToken(token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const invitation = await db
    .select()
    .from(userInvitations)
    .where(and(eq(userInvitations.token, token), eq(userInvitations.used, 0)))
    .limit(1);

  if (invitation.length === 0) {
    return null;
  }

  // Check if expired
  if (new Date() > invitation[0].expiresAt) {
    return null;
  }

  return invitation[0];
}

/**
 * Mark invitation as used
 */
export async function markInvitationAsUsed(token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(userInvitations)
    .set({ used: 1 })
    .where(eq(userInvitations.token, token));
}

/**
 * Calculate subscription end date based on type
 */
export function calculateSubscriptionEndDate(
  subscriptionType: "monthly" | "annual" | "indefinite"
): Date | null {
  if (subscriptionType === "indefinite") {
    return null; // No end date for indefinite subscriptions
  }

  const endDate = new Date();
  
  if (subscriptionType === "monthly") {
    endDate.setMonth(endDate.getMonth() + 1);
  } else if (subscriptionType === "annual") {
    endDate.setFullYear(endDate.getFullYear() + 1);
  }

  return endDate;
}

/**
 * Update user subscription
 */
export async function updateUserSubscription(
  userId: number,
  subscriptionType: "monthly" | "annual" | "indefinite",
  subscriptionStatus: "active" | "expired" | "cancelled"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const subscriptionEndDate = calculateSubscriptionEndDate(subscriptionType);

  await db
    .update(users)
    .set({
      subscriptionType,
      subscriptionEndDate,
      subscriptionStatus,
    })
    .where(eq(users.id, userId));
}

/**
 * Extend subscription by adding time
 */
export async function extendSubscription(userId: number, days: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user.length === 0) {
    throw new Error("User not found");
  }

  const currentEndDate = user[0].subscriptionEndDate || new Date();
  const newEndDate = new Date(currentEndDate);
  newEndDate.setDate(newEndDate.getDate() + days);

  await db
    .update(users)
    .set({
      subscriptionEndDate: newEndDate,
      subscriptionStatus: "active",
    })
    .where(eq(users.id, userId));
}

/**
 * Get all pending invitations
 */
export async function getPendingInvitations() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const invitations = await db
    .select()
    .from(userInvitations)
    .where(eq(userInvitations.used, 0))
    .orderBy(desc(userInvitations.createdAt));

  return invitations;
}
