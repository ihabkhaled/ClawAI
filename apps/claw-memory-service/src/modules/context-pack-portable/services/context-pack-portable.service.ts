import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ContextPackItemType } from '../../../generated/prisma';
import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import { ContextPacksRepository } from '../../context-packs/repositories/context-packs.repository';
import { ContextPacksService } from '../../context-packs/services/context-packs.service';
import type { PackExportPayload, PackImportResult } from '../types/context-pack-portable.types';

export type { PackExportPayload, PackImportResult };

@Injectable()
export class ContextPackPortableService {
  private readonly logger = new Logger(ContextPackPortableService.name);

  constructor(
    private readonly packsRepo: ContextPacksRepository,
    private readonly packsService: ContextPacksService,
  ) {}

  async exportPack(packId: string, userId: string): Promise<PackExportPayload> {
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
    return {
      version: pack.version,
      name: pack.name,
      description: pack.description,
      tags: pack.tags,
      scope: pack.scope,
      visibility: pack.visibility,
      items: pack.items.map((it) => ({
        itemType: it.itemType,
        content: it.content,
        url: it.url,
        sortOrder: it.sortOrder,
        pinned: it.pinned,
        tokenCountEstimate: it.tokenCountEstimate,
      })),
    };
  }

  async importPack(userId: string, payload: PackExportPayload): Promise<PackImportResult> {
    const created = await this.packsService.createContextPack(userId, {
      name: payload.name,
      description: payload.description ?? undefined,
      tags: payload.tags,
    });
    const errors: string[] = [];
    let inserted = 0;
    let skipped = 0;
    for (let i = 0; i < payload.items.length; i += 1) {
      const it = payload.items[i];
      if (!it) {
        skipped += 1;
        continue;
      }
      try {
        await this.packsService.addItem(created.id, userId, {
          itemType: it.itemType as ContextPackItemType,
          content: it.content ?? undefined,
          url: it.url ?? undefined,
          sortOrder: it.sortOrder,
          pinned: it.pinned,
        });
        inserted += 1;
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'unknown';
        errors.push(`item ${String(i)}: ${msg}`);
        skipped += 1;
      }
    }
    this.logger.log(
      `importPack: userId=${userId} packId=${created.id} inserted=${String(inserted)} skipped=${String(skipped)}`,
    );
    return { packId: created.id, insertedItems: inserted, skippedItems: skipped, errors };
  }
}
