import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { SuggestionTriggerRuleRepository } from '../repositories/suggestion-trigger-rule.repository';
import type { CreateTriggerRuleDto, UpdateTriggerRuleDto } from '../dto/trigger-rule.dto';
import type { SuggestionTriggerRule } from '../../../generated/prisma';

@Injectable()
export class SuggestionTriggerRuleService {
  private readonly logger = new Logger(SuggestionTriggerRuleService.name);

  constructor(private readonly repo: SuggestionTriggerRuleRepository) {}

  async list(): Promise<SuggestionTriggerRule[]> {
    this.logger.debug('list: invoked');
    return this.repo.listAll();
  }

  async getById(id: string): Promise<SuggestionTriggerRule> {
    this.logger.debug(`getById: id=${id}`);
    const rule = await this.repo.findById(id);
    if (rule === null) {
      throw new NotFoundException({ messageKey: 'RULE_NOT_FOUND' });
    }
    return rule;
  }

  async create(dto: CreateTriggerRuleDto, createdBy: string): Promise<SuggestionTriggerRule> {
    this.logger.debug(`create: name=${dto.name}`);
    const existing = await this.repo.findByName(dto.name);
    if (existing !== null) {
      throw new ConflictException({ messageKey: 'RULE_NAME_TAKEN' });
    }
    const created = await this.repo.createCustom(dto, createdBy);
    this.logger.log(`create: completed id=${created.id} name=${created.name}`);
    return created;
  }

  async update(id: string, dto: UpdateTriggerRuleDto): Promise<SuggestionTriggerRule> {
    this.logger.debug(`update: id=${id}`);
    await this.getById(id);
    const updated = await this.repo.update(id, dto);
    this.logger.log(`update: completed id=${id}`);
    return updated;
  }

  async deleteById(id: string): Promise<void> {
    this.logger.debug(`deleteById: id=${id}`);
    const rule = await this.getById(id);
    if (rule.isSystemDefault) {
      throw new ConflictException({ messageKey: 'RULE_SYSTEM_DEFAULT_PROTECTED' });
    }
    await this.repo.deleteById(id);
    this.logger.log(`deleteById: completed id=${id}`);
  }
}
