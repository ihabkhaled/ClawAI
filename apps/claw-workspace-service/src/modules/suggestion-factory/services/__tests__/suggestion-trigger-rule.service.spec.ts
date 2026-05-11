import { ConflictException, NotFoundException } from '@nestjs/common';

import type { CreateTriggerRuleDto, UpdateTriggerRuleDto } from '../../dto/trigger-rule.dto';
import { SuggestionTriggerRuleService } from '../suggestion-trigger-rule.service';

const makeRule = (overrides: Record<string, unknown> = {}): unknown => ({
  id: overrides['id'] ?? 'r1',
  name: overrides['name'] ?? 'custom-rule',
  description: overrides['description'] ?? null,
  eventType: 'workspace.webhook.received',
  providerRegex: overrides['providerRegex'] ?? '^GITHUB$',
  contentRegex: overrides['contentRegex'] ?? '.*',
  actionKindToSuggest: overrides['actionKindToSuggest'] ?? 'SUMMARIZE',
  isActive: overrides['isActive'] ?? true,
  isSystemDefault: overrides['isSystemDefault'] ?? false,
  priority: overrides['priority'] ?? 0,
  perRuleBudgetPerHour: null,
  createdBy: 'u1',
  createdAt: new Date(),
  updatedAt: new Date(),
});

const makeRepo = (overrides: Record<string, jest.Mock> = {}): Record<string, jest.Mock> => ({
  findById: jest.fn(),
  findByName: jest.fn(),
  listAll: jest.fn(),
  createCustom: jest.fn(),
  update: jest.fn(),
  deleteById: jest.fn(),
  ...overrides,
});

describe('SuggestionTriggerRuleService', () => {
  describe('list', () => {
    it('returns all rules from repo', async () => {
      const rule = makeRule();
      const repo = makeRepo({ listAll: jest.fn().mockResolvedValue([rule]) });
      const service = new SuggestionTriggerRuleService(repo as any);
      const result = await service.list();
      expect(result).toEqual([rule]);
      expect(repo['listAll']).toHaveBeenCalledTimes(1);
    });

    it('returns empty array when no rules', async () => {
      const repo = makeRepo({ listAll: jest.fn().mockResolvedValue([]) });
      const service = new SuggestionTriggerRuleService(repo as any);
      const result = await service.list();
      expect(result).toEqual([]);
    });
  });

  describe('getById', () => {
    it('returns rule when found', async () => {
      const rule = makeRule();
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue(rule) });
      const service = new SuggestionTriggerRuleService(repo as any);
      const result = await service.getById('r1');
      expect(result).toEqual(rule);
    });

    it('throws NotFoundException when missing', async () => {
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
      const service = new SuggestionTriggerRuleService(repo as any);
      await expect(service.getById('missing')).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.getById('missing')).rejects.toMatchObject({
        response: { messageKey: 'RULE_NOT_FOUND' },
      });
    });
  });

  describe('create', () => {
    const validDto: CreateTriggerRuleDto = {
      name: 'custom-rule',
      eventType: 'workspace.webhook.received',
      providerRegex: '^GITHUB$',
      contentRegex: '.*',
      actionKindToSuggest: 'SUMMARIZE',
      isActive: true,
      priority: 0,
    };

    it('creates a rule when name is unique', async () => {
      const created = makeRule();
      const repo = makeRepo({
        findByName: jest.fn().mockResolvedValue(null),
        createCustom: jest.fn().mockResolvedValue(created),
      });
      const service = new SuggestionTriggerRuleService(repo as any);
      const result = await service.create(validDto, 'u1');
      expect(result).toEqual(created);
      expect(repo['createCustom']).toHaveBeenCalledWith(validDto, 'u1');
    });

    it('throws ConflictException when name is taken', async () => {
      const repo = makeRepo({
        findByName: jest.fn().mockResolvedValue(makeRule()),
      });
      const service = new SuggestionTriggerRuleService(repo as any);
      await expect(service.create(validDto, 'u1')).rejects.toBeInstanceOf(ConflictException);
      await expect(service.create(validDto, 'u1')).rejects.toMatchObject({
        response: { messageKey: 'RULE_NAME_TAKEN' },
      });
      expect(repo['createCustom']).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates rule when id exists', async () => {
      const dto: UpdateTriggerRuleDto = { isActive: false };
      const existing = makeRule();
      const updated = makeRule({ isActive: false });
      const repo = makeRepo({
        findById: jest.fn().mockResolvedValue(existing),
        update: jest.fn().mockResolvedValue(updated),
      });
      const service = new SuggestionTriggerRuleService(repo as any);
      const result = await service.update('r1', dto);
      expect(result).toEqual(updated);
      expect(repo['update']).toHaveBeenCalledWith('r1', dto);
    });

    it('throws NotFoundException when id missing', async () => {
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
      const service = new SuggestionTriggerRuleService(repo as any);
      await expect(service.update('missing', {})).rejects.toBeInstanceOf(NotFoundException);
      expect(repo['update']).not.toHaveBeenCalled();
    });
  });

  describe('deleteById', () => {
    it('deletes user-created rule', async () => {
      const repo = makeRepo({
        findById: jest.fn().mockResolvedValue(makeRule({ isSystemDefault: false })),
        deleteById: jest.fn().mockReturnValue(Promise.resolve()),
      });
      const service = new SuggestionTriggerRuleService(repo as any);
      await service.deleteById('r1');
      expect(repo['deleteById']).toHaveBeenCalledWith('r1');
    });

    it('throws ConflictException when system-default', async () => {
      const repo = makeRepo({
        findById: jest.fn().mockResolvedValue(makeRule({ isSystemDefault: true })),
      });
      const service = new SuggestionTriggerRuleService(repo as any);
      await expect(service.deleteById('r1')).rejects.toBeInstanceOf(ConflictException);
      await expect(service.deleteById('r1')).rejects.toMatchObject({
        response: { messageKey: 'RULE_SYSTEM_DEFAULT_PROTECTED' },
      });
      expect(repo['deleteById']).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when id missing', async () => {
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
      const service = new SuggestionTriggerRuleService(repo as any);
      await expect(service.deleteById('missing')).rejects.toBeInstanceOf(NotFoundException);
      expect(repo['deleteById']).not.toHaveBeenCalled();
    });
  });
});
