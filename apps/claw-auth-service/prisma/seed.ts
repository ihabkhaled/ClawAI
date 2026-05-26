import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma";
import { hashPassword } from "../src/common/utilities/hashing.utility";

// Prefer .env overrides; fall back to safe defaults for first-run dev installs.
const DEFAULT_ADMIN_EMAIL = process.env["ADMIN_EMAIL"] ?? "admin@claw.local";
const DEFAULT_ADMIN_USERNAME = process.env["ADMIN_USERNAME"] ?? "admin";
const DEFAULT_ADMIN_PASSWORD = process.env["ADMIN_PASSWORD"] ?? "ClawAdmin123!";

// Prisma 7 dropped support for `new PrismaClient()` with no args — every
// client must be wired through a driver adapter (or Accelerate). Mirror the
// runtime PrismaService here so `prisma db seed` works on a fresh install.
const connectionString = process.env["AUTH_DATABASE_URL"];
if (!connectionString) {
  throw new Error("AUTH_DATABASE_URL must be set when running prisma db seed");
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function seed(): Promise<void> {
  const existingCount = await prisma.user.count();

  if (existingCount > 0) {
    console.warn("Users already exist — skipping seed.");
    return;
  }

  const passwordHash = await hashPassword(DEFAULT_ADMIN_PASSWORD);

  const admin = await prisma.user.create({
    data: {
      email: DEFAULT_ADMIN_EMAIL,
      username: DEFAULT_ADMIN_USERNAME,
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      mustChangePassword: true,
    },
  });

  console.warn(`Seeded default admin user: ${admin.email} (id: ${admin.id})`);
  console.warn("IMPORTANT: Change the admin password on first login.");
}

seed()
  .catch((error: unknown) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
