import { describe, expect, it, beforeAll } from "vitest";
import * as customAuth from "./customAuth";
import { getDb } from "./db";
import { users, passwordResetTokens } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Custom Authentication", () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = "testpassword123";
  const testName = "Test User";

  beforeAll(async () => {
    // Clean up any existing test users
    const db = await getDb();
    if (db) {
      await db.delete(users).where(eq(users.email, testEmail));
    }
  });

  it("should hash passwords correctly", async () => {
    const hash = await customAuth.hashPassword(testPassword);
    expect(hash).toBeTruthy();
    expect(hash).not.toBe(testPassword);
    expect(hash.length).toBeGreaterThan(20);
  });

  it("should verify passwords correctly", async () => {
    const hash = await customAuth.hashPassword(testPassword);
    const isValid = await customAuth.verifyPassword(testPassword, hash);
    expect(isValid).toBe(true);

    const isInvalid = await customAuth.verifyPassword("wrongpassword", hash);
    expect(isInvalid).toBe(false);
  });

  it("should register a new user", async () => {
    await customAuth.registerUser(testEmail, testPassword, testName);

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, testEmail))
      .limit(1);

    expect(result.length).toBe(1);
    expect(result[0]?.email).toBe(testEmail);
    expect(result[0]?.name).toBe(testName);
    expect(result[0]?.loginMethod).toBe("email");
    expect(result[0]?.passwordHash).toBeTruthy();
  });

  it("should not allow duplicate email registration", async () => {
    await expect(
      customAuth.registerUser(testEmail, testPassword, testName)
    ).rejects.toThrow("User with this email already exists");
  });

  it("should authenticate user with correct credentials", async () => {
    const user = await customAuth.authenticateUser(testEmail, testPassword);
    expect(user).toBeTruthy();
    expect(user.email).toBe(testEmail);
    expect(user.name).toBe(testName);
  });

  it("should reject authentication with wrong password", async () => {
    await expect(
      customAuth.authenticateUser(testEmail, "wrongpassword")
    ).rejects.toThrow("Invalid email or password");
  });

  it("should reject authentication with non-existent email", async () => {
    await expect(
      customAuth.authenticateUser("nonexistent@example.com", testPassword)
    ).rejects.toThrow("Invalid email or password");
  });

  it("should create password reset token", async () => {
    const token = await customAuth.createPasswordResetToken(testEmail);
    expect(token).toBeTruthy();
    expect(token.length).toBeGreaterThan(20);

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token))
      .limit(1);

    expect(result.length).toBe(1);
    expect(result[0]?.used).toBe(0);
  });

  it("should reset password with valid token", async () => {
    const token = await customAuth.createPasswordResetToken(testEmail);
    const newPassword = "newpassword456";

    await customAuth.resetPassword(token, newPassword);

    // Should be able to login with new password
    const user = await customAuth.authenticateUser(testEmail, newPassword);
    expect(user).toBeTruthy();

    // Old password should not work
    await expect(
      customAuth.authenticateUser(testEmail, testPassword)
    ).rejects.toThrow("Invalid email or password");

    // Token should be marked as used
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token))
      .limit(1);

    expect(result[0]?.used).toBe(1);
  });

  it("should reject password reset with invalid token", async () => {
    await expect(
      customAuth.resetPassword("invalid-token", "newpassword")
    ).rejects.toThrow("Invalid or expired reset token");
  });

  it("should reject password reset with used token", async () => {
    const token = await customAuth.createPasswordResetToken(testEmail);
    await customAuth.resetPassword(token, "anotherpassword");

    // Try to use the same token again
    await expect(
      customAuth.resetPassword(token, "yetanotherpassword")
    ).rejects.toThrow("Invalid or expired reset token");
  });
});
