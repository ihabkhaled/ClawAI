import { AuthKind } from '../../../common/enums/auth-kind.enum';
import { CatalogStatus } from '../../../common/enums/catalog-status.enum';
import { InstallStatus } from '../../../common/enums/install-status.enum';
import { RiskLevel } from '../../../common/enums/risk-level.enum';
import { type InstallRecord, type InstallRow } from '../types/install.types';

/** Maps a Prisma install row (with its relations) to the service's own record shape. */
export function mapInstallRow(row: InstallRow, latestVersion: string | null): InstallRecord {
  return {
    id: row.id,
    userId: row.userId,
    status: InstallStatus[row.status],
    settings: row.settings,
    installedAt: row.installedAt,
    updatedAt: row.updatedAt,
    plugin: {
      id: row.plugin.id,
      slug: row.plugin.slug,
      status: CatalogStatus[row.plugin.status],
      globallyEnabled: row.plugin.globallyEnabled,
      translations: row.plugin.translations,
      iconKey: row.plugin.iconKey,
      latestVersion,
    },
    version: row.version,
    credential:
      row.credential === null
        ? null
        : { kind: AuthKind[row.credential.kind], updatedAt: row.credential.updatedAt },
    consents: row.consents.map((consent) => ({
      toolName: consent.toolName,
      level: RiskLevel[consent.level],
      grantedAt: consent.grantedAt,
    })),
  };
}
