import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type AccountDeletionCounts } from '../types/account-deletion.types';

@Injectable()
export class AccountDeletionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Removes everything the plugin service holds for one user, in one transaction: credentials,
   * consents, installs and the invocation audit. Running it again finds nothing, so a redelivered
   * event is harmless. Install counts on the catalog entries are brought back down.
   */
  async deleteAllForUser(userId: string): Promise<AccountDeletionCounts> {
    return this.prisma.$transaction(async (tx) => {
      const installs = await tx.pluginInstall.findMany({
        where: { userId },
        select: { pluginId: true },
      });
      const credentials = await tx.pluginCredential.deleteMany({ where: { userId } });
      const consents = await tx.pluginToolConsent.deleteMany({ where: { install: { userId } } });
      const invocations = await tx.pluginInvocation.deleteMany({ where: { userId } });
      const removed = await tx.pluginInstall.deleteMany({ where: { userId } });
      await tx.mcpServerCredential.deleteMany({ where: { userId } });
      const servers = await tx.mcpServer.deleteMany({ where: { ownerUserId: userId } });
      for (const pluginId of new Set(installs.map((install) => install.pluginId))) {
        await tx.pluginCatalogEntry.updateMany({
          where: { id: pluginId, installCount: { gt: 0 } },
          data: { installCount: { decrement: 1 } },
        });
      }
      return {
        installs: removed.count,
        credentials: credentials.count,
        consents: consents.count,
        invocations: invocations.count,
        servers: servers.count,
      };
    });
  }
}
