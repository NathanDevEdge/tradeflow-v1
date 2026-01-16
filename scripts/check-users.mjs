import { drizzle } from "drizzle-orm/mysql2";
import { users } from "../drizzle/schema.js";

async function checkUsers() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const db = drizzle(process.env.DATABASE_URL);

  try {
    const allUsers = await db.select().from(users);
    
    console.log("Current users in database:");
    console.log("=========================\n");
    
    allUsers.forEach(user => {
      console.log(`Email: ${user.email}`);
      console.log(`Name: ${user.name || "N/A"}`);
      console.log(`Role: ${user.role}`);
      console.log(`Login Method: ${user.loginMethod || "N/A"}`);
      console.log(`OpenID: ${user.openId || "N/A"}`);
      console.log(`Status: ${user.status}`);
      console.log(`Subscription: ${user.subscriptionType || "None"}`);
      console.log("---");
    });
    
  } catch (error) {
    console.error("Error checking users:", error);
    process.exit(1);
  }

  process.exit(0);
}

checkUsers();
