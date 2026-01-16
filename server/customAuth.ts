import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import * as db from "./db";
import { getDb } from "./db";
import { users, passwordResetTokens } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

const SALT_ROUNDS = 10;
const RESET_TOKEN_EXPIRY_HOURS = 24;

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Register a new user with email and password
 */
export async function registerUser(email: string, password: string, name?: string) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  // Check if user already exists
  const existingUser = await db.getUserByEmail(email);
  if (existingUser) {
    throw new Error("User with this email already exists");
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  const result = await database.insert(users).values({
    email,
    passwordHash,
    name: name || null,
    loginMethod: "email",
    role: "user",
    status: "active",
  });

  return result;
}

/**
 * Authenticate user with email and password
 */
export async function authenticateUser(email: string, password: string) {
  const user = await db.getUserByEmail(email);
  
  if (!user) {
    throw new Error("Invalid email or password");
  }

  if (!user.passwordHash) {
    throw new Error("This account uses OAuth login");
  }

  if (user.status !== "active") {
    throw new Error("Account is not active");
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  
  if (!isValid) {
    throw new Error("Invalid email or password");
  }

  // Update last signed in
  const database = await getDb();
  if (database) {
    await database
      .update(users)
      .set({ lastSignedIn: new Date() })
      .where(eq(users.id, user.id));
  }

  return user;
}

/**
 * Create a password reset token
 */
export async function createPasswordResetToken(email: string): Promise<string> {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const user = await db.getUserByEmail(email);
  if (!user) {
    throw new Error("User not found");
  }

  if (!user.passwordHash) {
    throw new Error("This account uses OAuth login and cannot reset password");
  }

  const token = nanoid(32);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + RESET_TOKEN_EXPIRY_HOURS);

  await database.insert(passwordResetTokens).values({
    userId: user.id,
    token,
    expiresAt,
    used: 0,
  });

  return token;
}

/**
 * Reset password using a token
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  // Find valid token
  const tokenRecord = await database
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.token, token),
        eq(passwordResetTokens.used, 0)
      )
    )
    .limit(1);

  if (tokenRecord.length === 0) {
    throw new Error("Invalid or expired reset token");
  }

  const resetToken = tokenRecord[0];

  // Check if token is expired
  if (new Date() > resetToken.expiresAt) {
    throw new Error("Reset token has expired");
  }

  // Hash new password
  const passwordHash = await hashPassword(newPassword);

  // Update user password
  await database
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, resetToken.userId));

  // Mark token as used
  await database
    .update(passwordResetTokens)
    .set({ used: 1 })
    .where(eq(passwordResetTokens.id, resetToken.id));
}

/**
 * Change user password (when already authenticated)
 */
export async function changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  // Get user
  const userResult = await database
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (userResult.length === 0) {
    throw new Error("User not found");
  }

  const user = userResult[0];

  if (!user.passwordHash) {
    throw new Error("This account uses OAuth login");
  }

  // Verify current password
  const isValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!isValid) {
    throw new Error("Current password is incorrect");
  }

  // Hash and update new password
  const passwordHash = await hashPassword(newPassword);
  await database
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, userId));
}
