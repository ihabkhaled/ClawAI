import { PrismaClient } from "../src/generated/prisma";
import { hashPassword } from "../src/common/utilities/hashing.utility";

const DEFAULT_ADMIN_EMAIL = "admin@claw.local";
const DEFAULT_ADMIN_USERNAME = "admin";
const DEFAULT_ADMIN_PASSWORD = "Admin123!";

const prisma = new PrismaClient();

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
