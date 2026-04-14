import { PrismaClient } from '../src/generated/prisma';

import { CATALOG_ENTRIES } from '../src/modules/ollama/constants/catalog-entries.constants';

const prisma = new PrismaClient();

type ModelCategory =
  | 'CODING'
  | 'FILE_GENERATION'
  | 'IMAGE_GENERATION'
  | 'ROUTING'
  | 'REASONING'
  | 'THINKING'
  | 'GENERAL';

async function seedCatalog(): Promise<void> {
  for (const entry of CATALOG_ENTRIES) {
    await prisma.modelCatalogEntry.upsert({
      where: {
        name_tag_runtime: {
          name: entry.name,
          tag: entry.tag,
          runtime: entry.runtime as 'OLLAMA' | 'COMFYUI',
        },
      },
      update: {
        displayName: entry.displayName,
        category: entry.category as ModelCategory,
        description: entry.description,
        sizeBytes: entry.sizeBytes,
        parameterCount: entry.parameterCount,
        ollamaName: entry.ollamaName,
        isRecommended: entry.isRecommended,
        capabilities: [...entry.capabilities],
      },
      create: {
        name: entry.name,
        tag: entry.tag,
        displayName: entry.displayName,
        category: entry.category as ModelCategory,
        description: entry.description,
        sizeBytes: entry.sizeBytes,
        parameterCount: entry.parameterCount,
        runtime: entry.runtime as 'OLLAMA' | 'COMFYUI',
        ollamaName: entry.ollamaName,
        isRecommended: entry.isRecommended,
        capabilities: [...entry.capabilities],
      },
    });
  }

  const count = await prisma.modelCatalogEntry.count();
  process.stdout.write(`Seeded ${String(count)} model catalog entries\n`);
}

seedCatalog()
  .catch((error: unknown) => {
    process.stderr.write(`Catalog seed failed: ${String(error)}\n`);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
