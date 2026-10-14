import { Injectable } from '@nestjs/common';

import { AuthKind } from '../../../common/enums/auth-kind.enum';
import { CatalogStatus } from '../../../common/enums/catalog-status.enum';
import { InstallStatus } from '../../../common/enums/install-status.enum';
import { RiskLevel } from '../../../common/enums/risk-level.enum';
import { RuntimeKind } from '../../../common/enums/runtime-kind.enum';
import { ServerState } from '../../../common/enums/server-status.enum';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { INSTALL_TARGET_SELECT } from '../constants/target-query.constants';
import { type InstallTargetRecord, type ServerTargetRecord } from '../types/target-record.types';

/** Reads what a call needs about its target. Always `where { id, owner }`: another user's id finds nothing. */
@Injectable()
export class InvokeTargetsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findInstall(userId: string, installId: string): Promise<InstallTargetRecord | null> {
    const row = await this.prisma.pluginInstall.findFirst({
      where: { id: installId, userId },
      select: INSTALL_TARGET_SELECT,
    });
    if (row === null) return null;
    return {
      installId: row.id,
      pluginId: row.pluginId,
      status: InstallStatus[row.status],
      settings: row.settings,
      slug: row.plugin.slug,
      catalogStatus: CatalogStatus[row.plugin.status],
      globallyEnabled: row.plugin.globallyEnabled,
      runtimeKind: RuntimeKind[row.version.runtimeKind],
      manifest: row.version.manifest,
      disabledTools: row.version.tools
        .filter((tool) => tool.disabledByAdmin)
        .map((tool) => tool.name),
      credential:
        row.credential === null
          ? null
          : {
              kind: AuthKind[row.credential.kind],
              headerName: row.credential.headerName,
              ciphertext: row.credential.ciphertext,
            },
      consents: row.consents.map((consent) => ({
        toolName: consent.toolName,
        level: RiskLevel[consent.level],
      })),
    };
  }

  async findServer(
    userId: string,
    serverId: string,
    localToolName: string,
  ): Promise<ServerTargetRecord | null> {
    const row = await this.prisma.mcpServer.findFirst({
      where: { id: serverId, ownerUserId: userId },
      select: {
        id: true,
        ownerUserId: true,
        slug: true,
        url: true,
        authKind: true,
        status: true,
        failureCount: true,
        breakerOpenedAt: true,
        tools: {
          where: { localName: localToolName },
          select: {
            name: true,
            localName: true,
            description: true,
            inputSchema: true,
            riskLevel: true,
            enabled: true,
            consentGranted: true,
          },
        },
      },
    });
    if (row === null) return null;
    const tool = row.tools.at(0);
    return {
      serverId: row.id,
      ownerUserId: row.ownerUserId,
      slug: row.slug,
      url: row.url,
      authKind: AuthKind[row.authKind],
      status: ServerState[row.status],
      failureCount: row.failureCount,
      breakerOpenedAt: row.breakerOpenedAt,
      tool: tool === undefined ? null : { ...tool, riskLevel: RiskLevel[tool.riskLevel] },
    };
  }
}
