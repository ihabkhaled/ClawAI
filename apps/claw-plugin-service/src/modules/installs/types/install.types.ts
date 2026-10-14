import type { Prisma } from '../../../generated/prisma';
import type { INSTALL_INCLUDE } from '../constants/install-query.constants';
import type { AuthKind } from '../../../common/enums/auth-kind.enum';
import type { CatalogStatus } from '../../../common/enums/catalog-status.enum';
import type { InstallStatus } from '../../../common/enums/install-status.enum';
import type { RiskLevel } from '../../../common/enums/risk-level.enum';

export type InstallRow = Prisma.PluginInstallGetPayload<{ include: typeof INSTALL_INCLUDE }>;

export type InstallPluginRecord = {
  id: string;
  slug: string;
  status: CatalogStatus;
  globallyEnabled: boolean;
  translations: unknown;
  iconKey: string;
  latestVersion: string | null;
};

export type InstallVersionRecord = { id: string; version: string; manifest: unknown };

export type InstallCredentialRecord = { kind: AuthKind; updatedAt: Date };

export type InstallConsentRecord = { toolName: string; level: RiskLevel; grantedAt: Date };

export type InstallRecord = {
  id: string;
  userId: string;
  status: InstallStatus;
  settings: unknown;
  installedAt: Date;
  updatedAt: Date;
  plugin: InstallPluginRecord;
  version: InstallVersionRecord;
  credential: InstallCredentialRecord | null;
  consents: InstallConsentRecord[];
};

/** A catalog entry as the install flow needs it: availability and every version it could pin. */
export type InstallEntryRecord = {
  id: string;
  slug: string;
  status: CatalogStatus;
  globallyEnabled: boolean;
  currentVersionId: string | null;
  /** Plan slugs that may install the entry; empty means every plan (admin curation). */
  allowedPlanSlugs: string[];
  versions: InstallVersionRecord[];
};

export type CreateInstallInput = {
  userId: string;
  pluginId: string;
  versionId: string;
  settings: Record<string, unknown>;
};

export type CreateInstallOutcome =
  | { kind: 'CREATED'; installId: string }
  | { kind: 'LIMIT'; current: number }
  | { kind: 'DUPLICATE' };

export type UpdateInstallInput = { status?: InstallStatus; settings?: Record<string, unknown> };

export type SaveCredentialInput = {
  userId: string;
  installId: string;
  kind: AuthKind;
  headerName: string;
  ciphertext: string;
  keyVersion: number;
};

export type SealedCredential = { ciphertext: string; keyVersion: number };
