import { assignHardwareProfiles } from './hardware-profile.utility';
import { classifyModel } from './model-classifier.utility';
import type { CatalogEntryInput, PreparedCatalogEntryInput } from '../types/catalog.types';

export function prepareCatalogSeedEntry(entry: CatalogEntryInput): PreparedCatalogEntryInput {
  const classification = classifyModel({
    name: entry.name,
    tag: entry.tag,
    displayName: entry.displayName,
    description: entry.description ?? null,
    capabilities: [...entry.capabilities],
  });

  return {
    ...entry,
    sizeBytes: entry.sizeBytes ?? null,
    businessCategories: classification.businessCategories.map((category) => category.toString()),
    hardwareProfiles: assignHardwareProfiles(entry.sizeBytes ?? null).map((profile) =>
      profile.toString(),
    ),
  };
}
