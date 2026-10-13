import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';

import { CatalogStatus } from '../../../common/enums/catalog-status.enum';
import { toJsonValue } from '../../../common/utilities/to-json-value.utility';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { INSTALL_ENTRY_INCLUDE, INSTALL_INCLUDE } from '../constants/install-query.constants';
import { INSTALLS_LIST_MAX } from '../constants/installs.constants';
import {
  type CreateInstallInput,
  type CreateInstallOutcome,
  type InstallEntryRecord,
  type InstallRecord,
  type InstallRow,
  type UpdateInstallInput,
} from '../types/install.types';
import { mapInstallRow } from '../utilities/map-install-row.utility';

@Injectable()
export class InstallsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** The install when it belongs to the user; another user's id is indistinguishable from none. */
  async findOwned(id: string, userId: string): Promise<InstallRecord | null> {
    const row = await this.prisma.pluginInstall.findFirst({
      where: { id, userId },
      include: INSTALL_INCLUDE,
    });
    if (row === null) return null;
    const [record] = await this.hydrate([row]);
    return record ?? null;
  }

  async findAllOwned(userId: string): Promise<InstallRecord[]> {
    const rows = await this.prisma.pluginInstall.findMany({
      where: { userId },
      include: INSTALL_INCLUDE,
      orderBy: [{ installedAt: 'desc' }, { id: 'asc' }],
      take: INSTALLS_LIST_MAX,
    });
    return this.hydrate(rows);
  }

  async findEntryForInstall(slug: string): Promise<InstallEntryRecord | null> {
    const entry = await this.prisma.pluginCatalogEntry.findUnique({
      where: { slug },
      include: INSTALL_ENTRY_INCLUDE,
    });
    if (entry === null) return null;
    return {
      id: entry.id,
      slug: entry.slug,
      status: CatalogStatus[entry.status],
      globallyEnabled: entry.globallyEnabled,
      currentVersionId: entry.currentVersionId,
      versions: entry.versions,
    };
  }

  /**
   * Creates the install unless the user already has it or is at the plan cap. The count and the
   * insert share one transaction behind a per-user advisory lock, so two parallel installs cannot
   * both slip under the cap.
   */
  async createWithinCap(
    input: CreateInstallInput,
    cap: number | null,
  ): Promise<CreateInstallOutcome> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.userId}))`;
      const existing = await tx.pluginInstall.findUnique({
        where: { userId_pluginId: { userId: input.userId, pluginId: input.pluginId } },
        select: { id: true },
      });
      if (existing !== null) return { kind: 'DUPLICATE' } as const;
      const current = await tx.pluginInstall.count({ where: { userId: input.userId } });
      if (cap !== null && current >= cap) return { kind: 'LIMIT', current } as const;
      // createMany + skipDuplicates answers a lost race with a zero count instead of an error.
      const installId = randomUUID();
      const created = await tx.pluginInstall.createMany({
        data: [
          {
            id: installId,
            userId: input.userId,
            pluginId: input.pluginId,
            versionId: input.versionId,
            settings: toJsonValue(input.settings),
          },
        ],
        skipDuplicates: true,
      });
      if (created.count === 0) return { kind: 'DUPLICATE' } as const;
      await tx.pluginCatalogEntry.update({
        where: { id: input.pluginId },
        data: { installCount: { increment: 1 } },
      });
      return { kind: 'CREATED', installId } as const;
    });
  }

  async update(
    id: string,
    userId: string,
    input: UpdateInstallInput,
  ): Promise<InstallRecord | null> {
    const result = await this.prisma.pluginInstall.updateMany({
      where: { id, userId },
      data: {
        ...(input.status === undefined ? {} : { status: input.status }),
        ...(input.settings === undefined ? {} : { settings: toJsonValue(input.settings) }),
      },
    });
    return result.count === 0 ? null : this.findOwned(id, userId);
  }

  /** Deletes the install (consents and the credential cascade) and gives the count back. */
  async remove(id: string, userId: string): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const install = await tx.pluginInstall.findFirst({
        where: { id, userId },
        select: { pluginId: true },
      });
      if (install === null) return false;
      await tx.pluginInstall.delete({ where: { id } });
      await tx.pluginCatalogEntry.updateMany({
        where: { id: install.pluginId, installCount: { gt: 0 } },
        data: { installCount: { decrement: 1 } },
      });
      return true;
    });
  }

  /** Adds each plugin's current version number; a plugin without one reads as null. */
  private async hydrate(rows: InstallRow[]): Promise<InstallRecord[]> {
    if (rows.length === 0) return [];
    const currentIds = rows
      .map((row) => row.plugin.currentVersionId)
      .filter((id): id is string => id !== null);
    const current = await this.prisma.pluginVersion.findMany({
      where: { id: { in: currentIds } },
      select: { id: true, version: true },
    });
    const versionById = new Map(current.map((version) => [version.id, version.version]));
    return rows.map((row) =>
      mapInstallRow(row, versionById.get(row.plugin.currentVersionId ?? '') ?? null),
    );
  }
}
