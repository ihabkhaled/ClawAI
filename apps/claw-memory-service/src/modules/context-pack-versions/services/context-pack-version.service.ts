import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';
import { AppConfig } from '../../../app/config/app.config';
import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import {
  type ContextPack,
  type ContextPackItem,
  type ContextPackVersion,
} from '../../../generated/prisma';
import { ContextPacksRepository } from '../../context-packs/repositories/context-packs.repository';
import type { ContextPackWithItems } from '../../context-packs/types/context-packs.types';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { fromPrismaJsonValue } from '../../../common/utilities/prisma-json.utility';
import { ContextPackVersionRepository } from '../repositories/context-pack-version.repository';
import type {
  VersionDiff,
  VersionDiffItem,
  VersionedItemSnapshot,
  VersionPayload,
} from '../types/context-pack-version.types';

@Injectable()
export class ContextPackVersionService {
  private readonly logger = new Logger(ContextPackVersionService.name);

  constructor(
    private readonly versionRepo: ContextPackVersionRepository,
    private readonly packsRepo: ContextPacksRepository,
    private readonly prisma: PrismaService,
    private readonly rabbit: RabbitMQService,
  ) {}

  async listVersions(packId: string, userId: string): Promise<ContextPackVersion[]> {
    await this.assertOwnedPack(packId, userId);
    return this.versionRepo.listForPack(packId);
  }

  async getVersion(packId: string, version: number, userId: string): Promise<ContextPackVersion> {
    await this.assertOwnedPack(packId, userId);
    const row = await this.versionRepo.findByVersion(packId, version);
    if (!row) {
      throw new EntityNotFoundException('ContextPackVersion', `${packId}@${String(version)}`);
    }
    return row;
  }

  async snapshotCurrent(
    packId: string,
    userId: string,
    summary?: string,
  ): Promise<ContextPackVersion> {
    const pack = await this.assertOwnedPack(packId, userId);
    const payload = this.toPayload(pack, pack.items);
    const version = pack.version;
    const row = await this.versionRepo.snapshot(packId, version, payload, userId, summary ?? null);
    await this.prune(packId);
    void this.rabbit.publish(EventPattern.CONTEXT_PACK_VERSION_CREATED, {
      contextPackId: packId,
      userId,
      version,
      summary: summary ?? null,
      timestamp: new Date().toISOString(),
    });
    return row;
  }

  async revertToVersion(
    packId: string,
    targetVersion: number,
    userId: string,
  ): Promise<ContextPackVersion> {
    const pack = await this.assertOwnedPack(packId, userId);
    const target = await this.versionRepo.findByVersion(packId, targetVersion);
    if (!target) {
      throw new EntityNotFoundException('ContextPackVersion', `${packId}@${String(targetVersion)}`);
    }
    const payload = fromPrismaJsonValue<VersionPayload>(target.payloadJson);
    // Snapshot the current state before reverting so the user can roll
    // forward if the revert was a mistake.
    await this.snapshotCurrent(packId, userId, `pre-revert from v${String(pack.version)}`);
    const newVersion = await this.applyPayload(packId, payload);
    void this.rabbit.publish(EventPattern.CONTEXT_PACK_VERSION_REVERTED, {
      contextPackId: packId,
      userId,
      fromVersion: pack.version,
      toVersion: newVersion.version,
      timestamp: new Date().toISOString(),
    });
    return newVersion;
  }

  async diff(
    packId: string,
    fromVersion: number,
    toVersion: number,
    userId: string,
  ): Promise<VersionDiff> {
    await this.assertOwnedPack(packId, userId);
    const from = await this.versionRepo.findByVersion(packId, fromVersion);
    const to = await this.versionRepo.findByVersion(packId, toVersion);
    if (!from || !to) {
      throw new EntityNotFoundException('ContextPackVersion', `${packId}@diff`);
    }
    const fromPayload = fromPrismaJsonValue<VersionPayload>(from.payloadJson);
    const toPayload = fromPrismaJsonValue<VersionPayload>(to.payloadJson);
    return this.buildDiff(fromVersion, toVersion, fromPayload, toPayload);
  }

  private async applyPayload(packId: string, payload: VersionPayload): Promise<ContextPackVersion> {
    // Clear current items then re-insert from the snapshot inside one transaction.
    await this.prisma.$transaction(async (tx) => {
      await tx.contextPackItem.deleteMany({ where: { contextPackId: packId } });
      for (const it of payload.items) {
        await tx.contextPackItem.create({
          data: {
            contextPackId: packId,
            itemType: it.itemType,
            content: it.content,
            fileId: it.fileId,
            url: it.url,
            memoryRefId: it.memoryRefId,
            sortOrder: it.sortOrder,
            isEnabled: it.isEnabled,
            pinned: it.pinned,
            tokenCountEstimate: it.tokenCountEstimate,
          },
        });
      }
      await tx.contextPack.update({
        where: { id: packId },
        data: {
          name: payload.name,
          description: payload.description,
          tags: payload.tags,
          version: { increment: 1 },
        },
      });
    });
    const refreshed = await this.assertExists(packId);
    const newVersion = refreshed.version;
    const newSnapshot = await this.versionRepo.snapshot(
      packId,
      newVersion,
      this.toPayload(refreshed, refreshed.items),
      'system',
      `revert to v${String(payload.items.length)}-items`,
    );
    await this.prune(packId);
    return newSnapshot;
  }

  private buildDiff(
    fromVersion: number,
    toVersion: number,
    from: VersionPayload,
    to: VersionPayload,
  ): VersionDiff {
    const fromMap = new Map(from.items.map((i) => [i.id, i]));
    const toMap = new Map(to.items.map((i) => [i.id, i]));
    const items: VersionDiffItem[] = [];
    for (const [id, before] of fromMap.entries()) {
      const after = toMap.get(id);
      if (after === undefined) {
        items.push({ itemId: id, status: 'REMOVED', before, after: null });
        continue;
      }
      const changed = JSON.stringify(before) !== JSON.stringify(after);
      items.push({
        itemId: id,
        status: changed ? 'CHANGED' : 'UNCHANGED',
        before,
        after,
      });
    }
    for (const [id, after] of toMap.entries()) {
      if (!fromMap.has(id)) {
        items.push({ itemId: id, status: 'ADDED', before: null, after });
      }
    }
    const packMetadataChanged =
      from.name !== to.name ||
      from.description !== to.description ||
      JSON.stringify(from.tags) !== JSON.stringify(to.tags);
    return { fromVersion, toVersion, packMetadataChanged, items };
  }

  private toPayload(pack: ContextPack, items: ContextPackItem[]): VersionPayload {
    return {
      name: pack.name,
      description: pack.description,
      tags: pack.tags,
      items: items.map<VersionedItemSnapshot>((it) => ({
        id: it.id,
        itemType: it.itemType,
        content: it.content,
        fileId: it.fileId,
        url: it.url,
        memoryRefId: it.memoryRefId,
        sortOrder: it.sortOrder,
        isEnabled: it.isEnabled,
        pinned: it.pinned,
        tokenCountEstimate: it.tokenCountEstimate,
      })),
    };
  }

  private async assertOwnedPack(packId: string, userId: string): Promise<ContextPackWithItems> {
    const pack = await this.packsRepo.findById(packId);
    if (!pack) {
      throw new EntityNotFoundException('ContextPack', packId);
    }
    if (pack.userId !== userId && pack.ownerUserId !== userId) {
      throw new BusinessException(
        'You do not have access to this context pack',
        'FORBIDDEN_CONTEXT_PACK_ACCESS',
        HttpStatus.FORBIDDEN,
      );
    }
    return pack;
  }

  private async assertExists(packId: string): Promise<ContextPackWithItems> {
    const pack = await this.packsRepo.findById(packId);
    if (!pack) {
      throw new EntityNotFoundException('ContextPack', packId);
    }
    return pack;
  }

  private async prune(packId: string): Promise<void> {
    try {
      const config = AppConfig.get();
      // CONTEXT_VERSION_RETENTION_COUNT defaults to 20; we read from env without
      // forcing the AppConfig schema to include it (this manager is allowed to
      // soft-resolve via process.env for an optional knob).
      const keep = Number(process.env['CONTEXT_VERSION_RETENTION_COUNT']) || 20;
      void config; // referenced to keep AppConfig live
      const pruned = await this.versionRepo.prune(packId, keep);
      if (pruned > 0) {
        this.logger.debug(`prune: packId=${packId} pruned=${String(pruned)}`);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`prune: failed packId=${packId} reason=${msg}`);
    }
  }
}
