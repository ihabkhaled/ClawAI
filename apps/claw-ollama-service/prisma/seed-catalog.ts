import { PrismaClient } from '../src/generated/prisma';

import { CATALOG_ENTRIES } from '../src/modules/ollama/constants/catalog-entries.constants';
import {
  DEPRECATED_DEFAULT_LOCAL_MODEL_KEYS,
  isDeprecatedDefaultLocalModel,
} from '../src/modules/ollama/constants/default-models.constants';
import {
  resolveCatalogDownloadStatus,
  resolveCatalogSourceUrl,
} from '../src/modules/ollama/utilities/catalog-reference.utility';
import { prepareCatalogSeedEntry } from '../src/modules/ollama/utilities/catalog-seed-entry.utility';

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
  await prisma.modelCatalogEntry.deleteMany({
    where: {
      runtime: 'OLLAMA',
      OR: [...DEPRECATED_DEFAULT_LOCAL_MODEL_KEYS].map((key) => {
        const [name, tag] = key.split(':');
        if (tag) {
          return { name, tag };
        }
        return { name: key };
      }),
    },
  });

  for (const entry of CATALOG_ENTRIES) {
    const preparedEntry = prepareCatalogSeedEntry(entry);
    const runtime = preparedEntry.runtime;
    const sourceUrl = resolveCatalogSourceUrl(preparedEntry);
    const ollamaName = preparedEntry.ollamaName ?? `${preparedEntry.name}:${preparedEntry.tag}`;
    const downloadStatus = resolveCatalogDownloadStatus(preparedEntry);
    if (runtime === 'OLLAMA') {
      const [name, tag] = ollamaName.split(':');
      if (name && tag && isDeprecatedDefaultLocalModel(name, tag)) {
        continue;
      }
    }

    await prisma.modelCatalogEntry.upsert({
      where: {
        name_tag_runtime: {
          name: preparedEntry.name,
          tag: preparedEntry.tag,
          runtime,
        },
      },
      update: {
        displayName: preparedEntry.displayName,
        category: preparedEntry.category as ModelCategory,
        description: preparedEntry.description,
        sizeBytes: preparedEntry.sizeBytes,
        parameterCount: preparedEntry.parameterCount,
        ollamaName: preparedEntry.ollamaName,
        sourceUrl,
        downloadStatus,
        isRecommended: preparedEntry.isRecommended,
        capabilities: [...preparedEntry.capabilities],
      },
      create: {
        name: preparedEntry.name,
        tag: preparedEntry.tag,
        displayName: preparedEntry.displayName,
        category: preparedEntry.category as ModelCategory,
        description: preparedEntry.description,
        sizeBytes: preparedEntry.sizeBytes,
        parameterCount: preparedEntry.parameterCount,
        runtime,
        ollamaName: preparedEntry.ollamaName,
        sourceUrl,
        downloadStatus,
        isRecommended: preparedEntry.isRecommended,
        capabilities: [...preparedEntry.capabilities],
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
