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
    const runtime = entry.runtime as 'OLLAMA' | 'COMFYUI';
    const sourceUrl = resolveCatalogSourceUrl({ ...entry, runtime });
    const ollamaName = entry.ollamaName ?? `${entry.name}:${entry.tag}`;
    const downloadStatus = resolveCatalogDownloadStatus({
      name: entry.name,
      tag: entry.tag,
      runtime,
      ollamaName: entry.ollamaName,
      sourceUrl,
    });
    if (runtime === 'OLLAMA') {
      const [name, tag] = ollamaName.split(':');
      const key = `${name}:${tag}`;
      if (isDeprecatedDefaultLocalModel(name, tag)) {
        continue;
      }
    }

    await prisma.modelCatalogEntry.upsert({
      where: {
        name_tag_runtime: {
          name: entry.name,
          tag: entry.tag,
          runtime,
        },
      },
      update: {
        displayName: entry.displayName,
        category: entry.category as ModelCategory,
        description: entry.description,
        sizeBytes: null,
        parameterCount: entry.parameterCount,
        ollamaName: entry.ollamaName,
        sourceUrl,
        downloadStatus,
        isRecommended: entry.isRecommended,
        capabilities: [...entry.capabilities],
      },
      create: {
        name: entry.name,
        tag: entry.tag,
        displayName: entry.displayName,
        category: entry.category as ModelCategory,
        description: entry.description,
        sizeBytes: null,
        parameterCount: entry.parameterCount,
        runtime,
        ollamaName: entry.ollamaName,
        sourceUrl,
        downloadStatus,
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
