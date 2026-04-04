import { PrismaClient } from "../src/generated/prisma";
import { hashPassword } from "../src/common/utilities/hashing.utility";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = process.env["ADMIN_EMAIL"];
  const username = process.env["ADMIN_USERNAME"];
  const password = process.env["ADMIN_PASSWORD"];

  if (!email || !username || !password) {
    throw new Error(
      "ADMIN_EMAIL, ADMIN_USERNAME, and ADMIN_PASSWORD environment variables are required for seeding.",
    );
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      username,
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      mustChangePassword: true,
    },
    create: {
      email,
      username,
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      mustChangePassword: true,
    },
  });

  console.warn(`Seeded admin user: ${user.email} (${user.id})`);
}

main()
  .catch((error: unknown) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
