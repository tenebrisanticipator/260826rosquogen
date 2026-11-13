import "dotenv/config";
import { randomBytes, randomUUID, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import postgres from "postgres";

const scrypt = promisify(scryptCallback);
const email = process.env.BOOTSTRAP_EMAIL?.trim().toLowerCase();
const password = process.env.BOOTSTRAP_PASSWORD;
const role = process.env.ACCOUNT_ROLE === "user" ? "user" : "admin";

if (!process.env.DATABASE_URL || !email || !password || password.length < 8) {
  console.error("Set DATABASE_URL, BOOTSTRAP_EMAIL, and a BOOTSTRAP_PASSWORD of at least 8 characters.");
  process.exit(1);
}

const salt = randomBytes(16).toString("hex");
const derived = await scrypt(password, salt, 64);
const passwordHash = `scrypt$${salt}$${Buffer.from(derived).toString("hex")}`;

// Configure PostgreSQL connection with SSL and disable prepared statement caching for Supabase connection pooling
const sql = postgres(process.env.DATABASE_URL, { ssl: "require", prepare: false });

try {
  const openId = `password:${randomUUID()}`;
  const name = email.split("@")[0];

  await sql`
    INSERT INTO users ("openId", name, email, "passwordHash", "loginMethod", role, "isActive", "createdAt", "updatedAt", "lastSignedIn")
    VALUES (${openId}, ${name}, ${email}, ${passwordHash}, 'credentials', ${role}, true, NOW(), NOW(), NOW())
    ON CONFLICT (email) DO UPDATE
    SET "passwordHash" = EXCLUDED."passwordHash", role = EXCLUDED.role, "isActive" = true, "updatedAt" = NOW()
  `;
  console.log(`Credential account ready for ${email} with role ${role}.`);
} finally {
  await sql.end();
}
