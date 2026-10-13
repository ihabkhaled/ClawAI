import { CatalogSource } from '../../../common/enums/catalog-source.enum';
import { type PluginManifestInput } from '../schemas/plugin-manifest.schema';
import { type CatalogEntryRecord } from '../types/catalog.types';
import { WEB_FETCH_MANIFEST } from '../../seeding/constants/manifests/web-fetch.manifest';

/** A visible catalog entry shaped like the repository returns it. */
export function buildEntryRecord(
  overrides: Partial<CatalogEntryRecord> = {},
  manifest: PluginManifestInput = WEB_FETCH_MANIFEST,
): CatalogEntryRecord {
  return {
    id: `entry-${manifest.slug}`,
    slug: manifest.slug,
    source: CatalogSource.FIRST_PARTY,
    category: manifest.category,
    publisher: manifest.publisher,
    iconKey: manifest.iconKey,
    homepageUrl: manifest.homepageUrl ?? null,
    translations: manifest.translations,
    featured: false,
    installCount: 0,
    currentVersion: {
      id: `version-${manifest.slug}`,
      version: manifest.version,
      manifest,
      tools: manifest.tools.map((tool) => ({
        name: tool.name,
        riskLevel: tool.riskLevel,
        disabledByAdmin: false,
      })),
    },
    versions: [manifest.version],
    ...overrides,
  };
}
