import "dotenv/config";
import { randomBytes, randomUUID, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import postgres from "postgres";

const scrypt = promisify(scryptCallback);

if (!process.env.DATABASE_URL) {
  console.error("Please set DATABASE_URL environment variable.");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { ssl: "require", prepare: false });

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${Buffer.from(derived).toString("hex")}`;
}

async function main() {
  console.log("Seeding database...");

  // 1. Seed Panel Types
  const panels = ["Mono PERC", "Polycrystalline", "Bifacial"];
  for (const name of panels) {
    await sql`
      INSERT INTO "panelTypes" (name, "isActive", "createdAt", "updatedAt")
      VALUES (${name}, true, NOW(), NOW())
      ON CONFLICT (name) DO NOTHING
    `;
  }
  console.log("Panel types seeded.");

  // 2. Seed Accounts
  const adminEmail = "admin@roshnisolar.com";
  const adminPass = "RoshniAdmin@2026";
  const adminHash = await hashPassword(adminPass);
  const adminOpenId = `password:${randomUUID()}`;

  await sql`
    INSERT INTO users ("openId", name, email, "passwordHash", "loginMethod", role, "isActive", "createdAt", "updatedAt", "lastSignedIn")
    VALUES (${adminOpenId}, 'Admin User', ${adminEmail}, ${adminHash}, 'credentials', 'admin', true, NOW(), NOW(), NOW())
    ON CONFLICT (email) DO UPDATE
    SET "passwordHash" = EXCLUDED."passwordHash", role = EXCLUDED.role, "isActive" = true, "updatedAt" = NOW()
  `;

  const salesEmail = "sales@roshnisolar.com";
  const salesPass = "RoshniSales@2026";
  const salesHash = await hashPassword(salesPass);
  const salesOpenId = `password:${randomUUID()}`;

  await sql`
    INSERT INTO users ("openId", name, email, "passwordHash", "loginMethod", role, "isActive", "createdAt", "updatedAt", "lastSignedIn")
    VALUES (${salesOpenId}, 'Sales Representative', ${salesEmail}, ${salesHash}, 'credentials', 'user', true, NOW(), NOW(), NOW())
    ON CONFLICT (email) DO UPDATE
    SET "passwordHash" = EXCLUDED."passwordHash", role = EXCLUDED.role, "isActive" = true, "updatedAt" = NOW()
  `;
  console.log("Test accounts seeded successfully.");

  // Retrieve user IDs for quotations linking
  const [adminUser] = await sql`SELECT id FROM users WHERE email = ${adminEmail}`;
  const [salesUser] = await sql`SELECT id FROM users WHERE email = ${salesEmail}`;

  // 3. Seed Sample Quotations
  const sampleQuotations = [
    {
      quotationNumber: "RS-2026-00001",
      customerName: "Rajesh Kumar",
      customerAddress: "45, Gandhi Nagar, Jaipur, Rajasthan",
      customerPhone: "9876543210",
      panelName: "Tata Power Mono 540W",
      panelType: "Mono PERC",
      panelWatt: 540,
      numberOfPanels: 10,
      plantSizeKw: 5.40,
      inverterCompany: "Growatt 5kW",
      plantCost: 245000.00,
      status: "generated",
      createdBy: adminUser.id
    },
    {
      quotationNumber: "RS-2026-00002",
      customerName: "Sunita Sharma",
      customerAddress: "12, Malviya Nagar, Jaipur, Rajasthan",
      customerPhone: "9123456789",
      panelName: "Waaree Bifacial 540W",
      panelType: "Bifacial",
      panelWatt: 540,
      numberOfPanels: 18,
      plantSizeKw: 9.72,
      inverterCompany: "Solis 10kW",
      plantCost: 430000.00,
      status: "draft",
      createdBy: salesUser.id
    },
    {
      quotationNumber: "RS-2026-00003",
      customerName: "Vikram Singh",
      customerAddress: "Sector 5, Mansarovar, Jaipur, Rajasthan",
      customerPhone: "9988776655",
      panelName: "Vikram Solar Mono 450W",
      panelType: "Mono PERC",
      panelWatt: 450,
      numberOfPanels: 6,
      plantSizeKw: 2.70,
      inverterCompany: "Sungrow 3kW",
      plantCost: 135000.00,
      status: "accepted",
      createdBy: salesUser.id
    }
  ];

  for (const q of sampleQuotations) {
    await sql`
      INSERT INTO quotations (
        "quotationNumber", "customerName", "customerAddress", "customerPhone",
        "panelName", "panelType", "panelWatt", "numberOfPanels", "plantSizeKw",
        "inverterCompany", "plantCost", status, "createdBy", "createdAt", "updatedAt", "quotationDate"
      )
      VALUES (
        ${q.quotationNumber}, ${q.customerName}, ${q.customerAddress}, ${q.customerPhone},
        ${q.panelName}, ${q.panelType}, ${q.panelWatt}, ${q.numberOfPanels}, ${q.plantSizeKw},
        ${q.inverterCompany}, ${q.plantCost}, ${q.status}, ${q.createdBy}, NOW(), NOW(), NOW()
      )
      ON CONFLICT ("quotationNumber") DO NOTHING
    `;
  }
  console.log("Sample quotations seeded successfully.");
  console.log("Seeding completed!");
}

main()
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  })
  .finally(() => sql.end());
