/* eslint-disable unicorn/no-useless-undefined */
import { ConflictException, NotFoundException } from '@nestjs/common';

import { AiActionPolicyKind } from '../../../../common/enums/ai-action-policy-kind.enum';
import { AiActionRiskLabel } from '../../../../common/enums/ai-action-risk-label.enum';
import type {
  CreateAiActionPolicyDto,
  UpdateAiActionPolicyDto,
} from '../../dto/ai-action-policy.dto';
import { AiActionPolicyService } from '../ai-action-policy.service';

const makePolicy = (overrides: Record<string, unknown> = {}): unknown => ({
  id: overrides['id'] ?? 'p1',
  name: overrides['name'] ?? 'custom-policy',
  kind: overrides['kind'] ?? AiActionPolicyKind.ALLOW,
  description: null,
  providerRegex: '.*',
  actionKindRegex: '.*',
  riskMaxLabel: AiActionRiskLabel.LOW,
  riskMaxScore: 30,
  priority: overrides['priority'] ?? 500,
  requireReason: false,
  isActive: overrides['isActive'] ?? true,
  isSystemDefault: overrides['isSystemDefault'] ?? false,
  createdBy: 'u1',
  createdAt: new Date(),
  updatedAt: new Date(),
});

const makeRepo = (overrides: Record<string, jest.Mock> = {}): Record<string, jest.Mock> => ({
  findById: jest.fn(),
  findByName: jest.fn(),
  listAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  deleteById: jest.fn(),
  ...overrides,
});

const mockRabbit = { publish: jest.fn().mockResolvedValue(undefined) };

describe('AiActionPolicyService', () => {
  describe('list', () => {
    it('returns all policies', async () => {
      const repo = makeRepo({ listAll: jest.fn().mockResolvedValue([makePolicy()]) });
      const service = new AiActionPolicyService(repo as any, mockRabbit as any);
      const result = await service.list();
      expect(result).toHaveLength(1);
      expect(repo['listAll']).toHaveBeenCalledTimes(1);
    });
  });

  describe('getById', () => {
    it('returns policy when found', async () => {
      const policy = makePolicy();
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue(policy) });
      const service = new AiActionPolicyService(repo as any, mockRabbit as any);
      const result = await service.getById('p1');
      expect(result).toEqual(policy);
    });

    it('throws NotFoundException when missing', async () => {
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
      const service = new AiActionPolicyService(repo as any, mockRabbit as any);
      await expect(service.getById('missing')).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.getById('missing')).rejects.toMatchObject({
        response: { messageKey: 'POLICY_NOT_FOUND' },
      });
    });
  });

  describe('create', () => {
    const validDto: CreateAiActionPolicyDto = {
      name: 'custom-policy',
      kind: AiActionPolicyKind.ALLOW,
      providerRegex: '.*',
      actionKindRegex: '.*',
      riskMaxLabel: AiActionRiskLabel.LOW,
      riskMaxScore: 30,
      priority: 500,
      requireReason: false,
      isActive: true,
    };

    it('creates policy when name is unique', async () => {
      const created = makePolicy();
      const repo = makeRepo({
        findByName: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(created),
      });
      const service = new AiActionPolicyService(repo as any, mockRabbit as any);
      const result = await service.create(validDto, 'u1');
      expect(result).toEqual(created);
      expect(repo['create']).toHaveBeenCalledTimes(1);
    });

    it('throws ConflictException when name is taken', async () => {
      const repo = makeRepo({
        findByName: jest.fn().mockResolvedValue(makePolicy()),
      });
      const service = new AiActionPolicyService(repo as any, mockRabbit as any);
      await expect(service.create(validDto, 'u1')).rejects.toBeInstanceOf(ConflictException);
      await expect(service.create(validDto, 'u1')).rejects.toMatchObject({
        response: { messageKey: 'POLICY_NAME_TAKEN' },
      });
      expect(repo['create']).not.toHaveBeenCalled();
    });

    it('sets isSystemDefault to false', async () => {
      const repo = makeRepo({
        findByName: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(makePolicy()),
      });
      const service = new AiActionPolicyService(repo as any, mockRabbit as any);
      await service.create(validDto, 'u1');
      expect(repo['create']).toHaveBeenCalledWith(
        expect.objectContaining({ isSystemDefault: false, createdBy: 'u1' }),
      );
    });
  });

  describe('update', () => {
    it('updates policy when id exists', async () => {
      const dto: UpdateAiActionPolicyDto = { isActive: false };
      const repo = makeRepo({
        findById: jest.fn().mockResolvedValue(makePolicy()),
        update: jest.fn().mockResolvedValue(makePolicy({ isActive: false })),
      });
      const service = new AiActionPolicyService(repo as any, mockRabbit as any);
      const result = await service.update('p1', dto, 'actor-u1');
      expect(result).toMatchObject({ isActive: false });
    });

    it('throws NotFoundException when id missing', async () => {
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
      const service = new AiActionPolicyService(repo as any, mockRabbit as any);
      await expect(service.update('missing', {}, 'actor-u1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repo['update']).not.toHaveBeenCalled();
    });

    it('only writes fields explicitly present in dto', async () => {
      const dto: UpdateAiActionPolicyDto = { isActive: false };
      const repo = makeRepo({
        findById: jest.fn().mockResolvedValue(makePolicy()),
        update: jest.fn().mockResolvedValue(makePolicy({ isActive: false })),
      });
      const service = new AiActionPolicyService(repo as any, mockRabbit as any);
      await service.update('p1', dto, 'actor-u1');
      expect(repo['update']).toHaveBeenCalledWith('p1', { isActive: false });
    });

    it('publishes AI_ACTION_POLICY_UPDATED audit event with before/after snapshots', async () => {
      const dto: UpdateAiActionPolicyDto = { isActive: false };
      const before = makePolicy({ isActive: true });
      const after = makePolicy({ isActive: false });
      const repo = makeRepo({
        findById: jest.fn().mockResolvedValue(before),
        update: jest.fn().mockResolvedValue(after),
      });
      const rabbit = { publish: jest.fn().mockResolvedValue(undefined) };
      const service = new AiActionPolicyService(repo as any, rabbit as any);
      await service.update('p1', dto, 'actor-u1');
      expect(rabbit.publish).toHaveBeenCalledWith(
        'ai_action.policy.updated',
        expect.objectContaining({
          policyId: 'p1',
          actorUserId: 'actor-u1',
          before,
          after,
        }),
      );
    });
  });

  describe('deleteById', () => {
    it('deletes user-created policy', async () => {
      const repo = makeRepo({
        findById: jest.fn().mockResolvedValue(makePolicy({ isSystemDefault: false })),
        deleteById: jest.fn().mockResolvedValue(undefined),
      });
      const service = new AiActionPolicyService(repo as any, mockRabbit as any);
      await service.deleteById('p1', 'actor-u1');
      expect(repo['deleteById']).toHaveBeenCalledWith('p1');
    });

    it('throws ConflictException when system-default', async () => {
      const repo = makeRepo({
        findById: jest.fn().mockResolvedValue(makePolicy({ isSystemDefault: true })),
      });
      const service = new AiActionPolicyService(repo as any, mockRabbit as any);
      await expect(service.deleteById('p1', 'actor-u1')).rejects.toBeInstanceOf(ConflictException);
      await expect(service.deleteById('p1', 'actor-u1')).rejects.toMatchObject({
        response: { messageKey: 'POLICY_SYSTEM_DEFAULT_PROTECTED' },
      });
      expect(repo['deleteById']).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when id missing', async () => {
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
      const service = new AiActionPolicyService(repo as any, mockRabbit as any);
      await expect(service.deleteById('missing', 'actor-u1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repo['deleteById']).not.toHaveBeenCalled();
    });

    it('publishes AI_ACTION_POLICY_DELETED audit event when policy removed', async () => {
      const policy = makePolicy({ isSystemDefault: false });
      const repo = makeRepo({
        findById: jest.fn().mockResolvedValue(policy),
        deleteById: jest.fn().mockResolvedValue(undefined),
      });
      const rabbit = { publish: jest.fn().mockResolvedValue(undefined) };
      const service = new AiActionPolicyService(repo as any, rabbit as any);
      await service.deleteById('p1', 'actor-u1');
      expect(rabbit.publish).toHaveBeenCalledWith(
        'ai_action.policy.deleted',
        expect.objectContaining({
          policyId: 'p1',
          actorUserId: 'actor-u1',
          before: null,
          after: policy,
        }),
      );
    });
  });

  describe('create — audit event', () => {
    const dto: CreateAiActionPolicyDto = {
      name: 'custom-policy',
      kind: AiActionPolicyKind.ALLOW,
      providerRegex: '.*',
      actionKindRegex: '.*',
      riskMaxLabel: AiActionRiskLabel.LOW,
      riskMaxScore: 30,
      priority: 500,
      requireReason: false,
      isActive: true,
    };

    it('publishes AI_ACTION_POLICY_CREATED audit event with new policy', async () => {
      const created = makePolicy();
      const repo = makeRepo({
        findByName: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(created),
      });
      const rabbit = { publish: jest.fn().mockResolvedValue(undefined) };
      const service = new AiActionPolicyService(repo as any, rabbit as any);
      await service.create(dto, 'creator-u1');
      expect(rabbit.publish).toHaveBeenCalledWith(
        'ai_action.policy.created',
        expect.objectContaining({
          policyId: 'p1',
          actorUserId: 'creator-u1',
          after: created,
        }),
      );
    });
  });
});
