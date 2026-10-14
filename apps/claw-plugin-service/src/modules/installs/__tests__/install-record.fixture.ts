import { AuthKind } from '../../../common/enums/auth-kind.enum';
import { CatalogStatus } from '../../../common/enums/catalog-status.enum';
import { InstallStatus } from '../../../common/enums/install-status.enum';
import { RiskLevel } from '../../../common/enums/risk-level.enum';
import { type PluginManifestInput } from '../../catalog/schemas/plugin-manifest.schema';
import { WEATHER_MANIFEST } from '../../seeding/constants/manifests/weather.manifest';
import { type InstallEntryRecord, type InstallRecord } from '../types/install.types';

export const OWNER_ID = 'user-1';
export const INSTALL_ID = '3f2b8f0e-9d3c-4c52-8c52-5d8f1b3a9a10';

function keyedTool(name: string, riskLevel: RiskLevel): PluginManifestInput['tools'][number] {
  return {
    name,
    title: name,
    description: `The ${name} tool`,
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    riskLevel,
    scopes: ['read'],
    resultKind: 'text',
    maxResultBytes: 16_384,
    timeoutMs: 10_000,
  };
}

/** An API-key plugin with one tool of each risk level, for credential and consent tests. */
export const KEYED_MANIFEST: PluginManifestInput = {
  ...WEATHER_MANIFEST,
  slug: 'keyed-notes',
  auth: { kind: AuthKind.API_KEY, headerName: 'X-API-Key' },
  tools: [
    keyedTool('read_note', RiskLevel.READ),
    keyedTool('write_note', RiskLevel.WRITE),
    keyedTool('delete_note', RiskLevel.DESTRUCTIVE),
  ],
};

/** An install as the repository returns it. */
export function buildInstallRecord(
  overrides: Partial<InstallRecord> = {},
  manifest: PluginManifestInput = WEATHER_MANIFEST,
): InstallRecord {
  return {
    id: INSTALL_ID,
    userId: OWNER_ID,
    status: InstallStatus.ENABLED,
    settings: { units: 'metric' },
    installedAt: new Date('2026-10-13T10:00:00.000Z'),
    updatedAt: new Date('2026-10-13T11:00:00.000Z'),
    plugin: {
      id: `entry-${manifest.slug}`,
      slug: manifest.slug,
      status: CatalogStatus.PUBLISHED,
      globallyEnabled: true,
      translations: manifest.translations,
      iconKey: manifest.iconKey,
      latestVersion: manifest.version,
    },
    version: { id: `version-${manifest.slug}`, version: manifest.version, manifest },
    credential: null,
    consents: [],
    ...overrides,
  };
}

/** A catalog entry as the install flow reads it. */
export function buildInstallEntry(
  overrides: Partial<InstallEntryRecord> = {},
  manifest: PluginManifestInput = WEATHER_MANIFEST,
): InstallEntryRecord {
  return {
    id: `entry-${manifest.slug}`,
    slug: manifest.slug,
    status: CatalogStatus.PUBLISHED,
    globallyEnabled: true,
    currentVersionId: `version-${manifest.slug}`,
    allowedPlanSlugs: [],
    versions: [{ id: `version-${manifest.slug}`, version: manifest.version, manifest }],
    ...overrides,
  };
}
