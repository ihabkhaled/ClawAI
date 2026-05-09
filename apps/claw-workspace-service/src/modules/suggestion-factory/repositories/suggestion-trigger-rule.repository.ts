import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type {
  CreateTriggerRuleInput,
  UpdateTriggerRuleInput,
} from '../types/suggestion-factory.types';
import type { SuggestionTriggerRule } from '../../../generated/prisma';

@Injectable()
export class SuggestionTriggerRuleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveByEvent(eventType: string): Promise<SuggestionTriggerRule[]> {
    return this.prisma.suggestionTriggerRule.findMany({
      where: { isActive: true, eventType },
      orderBy: { priority: 'desc' },
    });
  }

  async findByName(name: string): Promise<SuggestionTriggerRule | null> {
    return this.prisma.suggestionTriggerRule.findUnique({ where: { name } });
  }

  async listAll(): Promise<SuggestionTriggerRule[]> {
    return this.prisma.suggestionTriggerRule.findMany({
      orderBy: [{ priority: 'desc' }, { name: 'asc' }],
    });
  }

  async upsertSystemDefault(
    input: CreateTriggerRuleInput & { isSystemDefault: true },
  ): Promise<SuggestionTriggerRule> {
    return this.prisma.suggestionTriggerRule.upsert({
      where: { name: input.name },
      create: {
        name: input.name,
        description: input.description ?? null,
        eventType: input.eventType,
        providerRegex: input.providerRegex,
        contentRegex: input.contentRegex,
        actionKindToSuggest: input.actionKindToSuggest,
        isActive: input.isActive,
        priority: input.priority,
        isSystemDefault: true,
      },
      update: {
        description: input.description ?? null,
        eventType: input.eventType,
        providerRegex: input.providerRegex,
        contentRegex: input.contentRegex,
        actionKindToSuggest: input.actionKindToSuggest,
        isActive: input.isActive,
        priority: input.priority,
      },
    });
  }

  async createCustom(
    input: CreateTriggerRuleInput,
    createdBy: string,
  ): Promise<SuggestionTriggerRule> {
    return this.prisma.suggestionTriggerRule.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        eventType: input.eventType,
        providerRegex: input.providerRegex,
        contentRegex: input.contentRegex,
        actionKindToSuggest: input.actionKindToSuggest,
        isActive: input.isActive,
        priority: input.priority,
        isSystemDefault: false,
        createdBy,
        perRuleBudgetPerHour: input.perRuleBudgetPerHour ?? null,
      },
    });
  }

  async update(id: string, input: UpdateTriggerRuleInput): Promise<SuggestionTriggerRule> {
    return this.prisma.suggestionTriggerRule.update({
      where: { id },
      data: {
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.eventType !== undefined ? { eventType: input.eventType } : {}),
        ...(input.providerRegex !== undefined ? { providerRegex: input.providerRegex } : {}),
        ...(input.contentRegex !== undefined ? { contentRegex: input.contentRegex } : {}),
        ...(input.actionKindToSuggest !== undefined
          ? { actionKindToSuggest: input.actionKindToSuggest }
          : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.perRuleBudgetPerHour !== undefined
          ? { perRuleBudgetPerHour: input.perRuleBudgetPerHour }
          : {}),
      },
    });
  }

  async deleteById(id: string): Promise<void> {
    await this.prisma.suggestionTriggerRule.delete({ where: { id } });
  }
}
