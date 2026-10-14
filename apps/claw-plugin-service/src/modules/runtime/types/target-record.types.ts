import type { Prisma } from '../../../generated/prisma';
import type { AuthKind } from '../../../common/enums/auth-kind.enum';
import type { CatalogStatus } from '../../../common/enums/catalog-status.enum';
import type { InstallStatus } from '../../../common/enums/install-status.enum';
import type { RiskLevel } from '../../../common/enums/risk-level.enum';
import type { RuntimeKind } from '../../../common/enums/runtime-kind.enum';
import type { ServerState } from '../../../common/enums/server-status.enum';
import type { INSTALL_TARGET_SELECT } from '../constants/target-query.constants';

export type InstallTargetRow = Prisma.PluginInstallGetPayload<{
  select: typeof INSTALL_TARGET_SELECT;
}>;

/** An install of a catalog plugin, as the invoke path reads it. */
export type InstallTargetRecord = {
  installId: string;
  pluginId: string;
  status: InstallStatus;
  settings: unknown;
  slug: string;
  catalogStatus: CatalogStatus;
  globallyEnabled: boolean;
  runtimeKind: RuntimeKind;
  manifest: unknown;
  disabledTools: string[];
  credential: { kind: AuthKind; headerName: string | null; ciphertext: string } | null;
  consents: Array<{ toolName: string; level: RiskLevel }>;
};

/** One of the user's own servers with the one tool being called. */
export type ServerTargetRecord = {
  serverId: string;
  ownerUserId: string;
  slug: string;
  url: string;
  authKind: AuthKind;
  status: ServerState;
  failureCount: number;
  breakerOpenedAt: Date | null;
  tool: {
    name: string;
    localName: string;
    description: string;
    inputSchema: unknown;
    riskLevel: RiskLevel;
    enabled: boolean;
    consentGranted: boolean;
  } | null;
};
