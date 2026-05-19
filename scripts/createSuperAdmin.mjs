/**
 * One-time script to create a super admin account.
 * Run with: node scripts/createSuperAdmin.mjs
 *
 * Set these env vars first (or add to .env):
 *   SUPER_ADMIN_EMAIL=you@example.com
 *   SUPER_ADMIN_PASSWORD=YourSecurePassword123!
 *   SUPER_ADMIN_NAME="Your Name"
 */

import "dotenv/config";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";

const email = process.env.SUPER_ADMIN_EMAIL;
const password = process.env.SUPER_ADMIN_PASSWORD;
const name = process.env.SUPER_ADMIN_NAME || "Super Admin";

if (!email || !password) {
  console.error("Error: Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD env vars before running.");
  process.exit(1);
}

if (password.length < 12) {
  console.error("Error: Password must be at least 12 characters for a super admin account.");
  process.exit(1);
}

const conn = await mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306"),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Check if user already exists
const [existing] = await conn.execute("SELECT id, role FROM users WHERE email = ?", [email.toLowerCase()]);
if (existing.length > 0) {
  const u = existing[0];
  if (u.role === "super_admin") {
    console.log(`✓ Super admin already exists: ${email} (id=${u.id})`);
  } else {
    // Upgrade existing user to super_admin and detach from org
    await conn.execute(
      "UPDATE users SET role = 'super_admin', organizationId = NULL, status = 'active' WHERE id = ?",
      [u.id]
    );
    console.log(`✓ Upgraded existing user ${email} (id=${u.id}) to super_admin and detached from org.`);
  }
  await conn.end();
  process.exit(0);
}

const passwordHash = await bcrypt.hash(password, 10);

const [result] = await conn.execute(
  `INSERT INTO users (email, passwordHash, name, loginMethod, role, status, organizationId, createdAt, updatedAt)
   VALUES (?, ?, ?, 'email', 'super_admin', 'active', NULL, NOW(), NOW())`,
  [email.toLowerCase(), passwordHash, name]
);

console.log(`✓ Super admin created: ${email} (id=${result.insertId})`);
console.log(`  Name: ${name}`);
console.log(`  Role: super_admin`);
console.log(`  Login at: ${process.env.APP_URL || "https://tradeflow.devedge.com.au"}/login`);

await conn.end();
