import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  type ContextPack,
  type ContextPackItemType,
  type ContextPackTemplate,
} from '../../../generated/prisma';
import { EntityNotFoundException } from '../../../common/errors';
import { ContextPacksService } from '../../context-packs/services/context-packs.service';
import { ContextPacksRepository } from '../../context-packs/repositories/context-packs.repository';
import { fromPrismaJsonValue } from '../../../common/utilities/prisma-json.utility';
import { SYSTEM_TEMPLATES } from '../constants/system-templates.constants';
import { ContextPackTemplateRepository } from '../repositories/context-pack-template.repository';
import type { CloneTemplateOptions, TemplatePayload } from '../types/context-pack-template.types';

@Injectable()
export class ContextPackTemplateService implements OnModuleInit {
  private readonly logger = new Logger(ContextPackTemplateService.name);

  constructor(
    private readonly templateRepo: ContextPackTemplateRepository,
    private readonly packsRepo: ContextPacksRepository,
    private readonly packsService: ContextPacksService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedSystemTemplates();
  }

  async list(category?: string): Promise<ContextPackTemplate[]> {
    return this.templateRepo.list(category);
  }

  async clone(
    templateId: string,
    userId: string,
    options: CloneTemplateOptions,
  ): Promise<ContextPack> {
    const template = await this.templateRepo.findById(templateId);
    if (!template) {
      throw new EntityNotFoundException('ContextPackTemplate', templateId);
    }
    const payload = fromPrismaJsonValue<TemplatePayload>(template.payloadJson);
    const created = await this.packsService.createContextPack(userId, {
      name: options.name ?? template.name,
      description: options.description ?? template.description ?? undefined,
      templateId,
    });
    for (let i = 0; i < payload.items.length; i += 1) {
      const item = payload.items[i];
      if (!item) continue;
      await this.packsService.addItem(created.id, userId, {
        itemType: item.itemType,
        content: item.content,
        pinned: item.pinned,
        sortOrder: i,
      });
    }
    void this.packsRepo;
    this.logger.log(`clone: templateId=${templateId} -> packId=${created.id} userId=${userId}`);
    return created;
  }

  private async seedSystemTemplates(): Promise<void> {
    try {
      for (const definition of SYSTEM_TEMPLATES) {
        const payload: TemplatePayload = {
          items: definition.items.map((it) => ({
            itemType: it.itemType as ContextPackItemType,
            content: it.content,
            pinned: it.pinned ?? false,
          })),
        };
        await this.templateRepo.upsertSystem(
          definition.name,
          definition.description,
          definition.category,
          payload,
        );
      }
      this.logger.log(
        `seedSystemTemplates: ensured ${String(SYSTEM_TEMPLATES.length)} system templates`,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`seedSystemTemplates: skipped — ${msg}`);
    }
  }
}
