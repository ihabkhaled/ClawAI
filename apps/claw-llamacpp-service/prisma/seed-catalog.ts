/**
 * Manual catalog seed script. The same entries are auto-upserted on app
 * boot by `CatalogBootstrapService`, so running this is only needed when
 * you want to refresh the catalog outside a service restart.
 *
 * Run via:
 *   cd apps/claw-llamacpp-service && npm run seed:catalog
 */
import { PrismaClient } from '../src/generated/prisma';
import { FRONTIER_CATALOG_ENTRIES } from '../src/modules/catalog/constants/frontier-catalog-entries.constants';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.warn(`Seeding ${FRONTIER_CATALOG_ENTRIES.length} frontier catalog entries...`);
  for (const entry of FRONTIER_CATALOG_ENTRIES) {
    await prisma.frontierCatalogEntry.upsert({
      where: { name_tag: { name: entry.name, tag: entry.tag } },
      create: { ...entry },
      update: { ...entry },
    });
  }
  console.warn('Catalog seed complete.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
