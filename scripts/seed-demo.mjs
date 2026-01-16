import { drizzle } from "drizzle-orm/mysql2";
import { users } from "../drizzle/schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const DEMO_EMAIL = "demo@devedge.com.au";
const DEMO_PASSWORD = "demo123!";
const DEMO_NAME = "Demo User";

async function seedDemo() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const db = drizzle(process.env.DATABASE_URL);

  try {
    // Check if demo user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, DEMO_EMAIL))
      .limit(1);

    if (existingUser.length > 0) {
      console.log("Demo user already exists, updating...");
      
      // Update existing demo user
      const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
      await db
        .update(users)
        .set({
          passwordHash,
          name: DEMO_NAME,
          loginMethod: "email",
          role: "user",
          status: "active",
          subscriptionType: "indefinite",
          subscriptionEndDate: null,
          subscriptionStatus: "active",
        })
        .where(eq(users.email, DEMO_EMAIL));
      
      console.log("✅ Demo user updated successfully");
    } else {
      console.log("Creating demo user...");
      
      // Create new demo user
      const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
      await db.insert(users).values({
        email: DEMO_EMAIL,
        passwordHash,
        name: DEMO_NAME,
        loginMethod: "email",
        role: "user",
        status: "active",
        subscriptionType: "indefinite",
        subscriptionEndDate: null,
        subscriptionStatus: "active",
      });
      
      console.log("✅ Demo user created successfully");
    }

    console.log("\nDemo Account Credentials:");
    console.log("Email:", DEMO_EMAIL);
    console.log("Password:", DEMO_PASSWORD);
    console.log("Subscription: Indefinite (never expires)");
    
  } catch (error) {
    console.error("Error seeding demo user:", error);
    process.exit(1);
  }

  process.exit(0);
}

seedDemo();
