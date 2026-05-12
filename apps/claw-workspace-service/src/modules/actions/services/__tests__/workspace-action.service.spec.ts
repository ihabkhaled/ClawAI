import { Test, type TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { WorkspaceActionService } from '../workspace-action.service';
import { WorkspaceActionRepository } from '../../repositories/workspace-action.repository';
import { WorkspaceConnectorRepository } from '../../../workspace/repositories/workspace-connector.repository';
import { ActionExecutionManager } from '../../managers/action-execution.manager';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { BusinessException } from '../../../../common/errors/business.exception';
import { EntityNotFoundException } from '../../../../common/errors/entity-not-found.exception';
import { WorkspaceActionStatus } from '../../../../common/enums/workspace-action-status.enum';
import { WorkspacePermissionLevel } from '../../../../common/enums/workspace-permission-level.enum';
import { ConnectorAccessService } from '../../../connector-access/services/connector-access.service';

const mockActionRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findAllByUser: jest.fn(),
  update: jest.fn(),
  findManyByIds: jest.fn(),
};

const mockConnectorRepository = {
  findById: jest.fn(),
};

const mockExecutionManager = {
  execute: jest.fn(),
};

const mockRabbitMQ = {
  publish: jest.fn().mockResolvedValue(null),
};

const makeConnector = (overrides = {}) => ({
  id: 'c1',
  userId: 'u1',
  provider: 'GITHUB',
  permissionLevel: WorkspacePermissionLevel.WRITE,
  encryptedTokens: 'enc',
  ...overrides,
});

const makeAction = (overrides = {}) => ({
  id: 'a1',
  userId: 'u1',
  connectorId: 'c1',
  actionType: 'CREATE_ISSUE',
  status: WorkspaceActionStatus.PENDING_APPROVAL,
  payload: {},
  expiresAt: new Date(Date.now() + 3_600_000),
  draftHistory: [],
  connector: { id: 'c1', name: 'My GitHub', provider: 'GITHUB', status: 'CONNECTED' },
  ...overrides,
});

describe('WorkspaceActionService', () => {
  let service: WorkspaceActionService;

  // v3 round 6 — mocked access service. Default: every call passes
  // (matches the legacy owner-check semantics). Individual tests override.
  const mockAccessService = {
    can: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceActionService,
        { provide: WorkspaceActionRepository, useValue: mockActionRepository },
        { provide: WorkspaceConnectorRepository, useValue: mockConnectorRepository },
        { provide: ActionExecutionManager, useValue: mockExecutionManager },
        { provide: RabbitMQService, useValue: mockRabbitMQ },
        { provide: ConnectorAccessService, useValue: mockAccessService },
      ],
    }).compile();

    service = module.get<WorkspaceActionService>(WorkspaceActionService);
    jest.clearAllMocks();
    mockAccessService.can.mockResolvedValue(true);
  });

  describe('createDraft', () => {
    it('should create and return a draft action', async () => {
      mockConnectorRepository.findById.mockResolvedValue(makeConnector());
      mockActionRepository.create.mockResolvedValue({ id: 'a1' });
      mockActionRepository.findById.mockResolvedValue(makeAction());

      const dto = {
        connectorId: 'c1',
        actionType: 'CREATE_ISSUE' as any,
        payload: { title: 'Bug' },
        expiresInHours: 24,
      };
      const result = await service.createDraft('u1', dto);

      expect(result.id).toBe('a1');
      expect(mockActionRepository.create).toHaveBeenCalled();
      expect(mockRabbitMQ.publish).toHaveBeenCalled();
    });

    it('should throw 404 when connector not found', async () => {
      mockConnectorRepository.findById.mockResolvedValue(null);

      await expect(
        service.createDraft('u1', {
          connectorId: 'bad',
          actionType: 'CREATE_ISSUE' as any,
          payload: { x: 1 },
          expiresInHours: 24,
        }),
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw 403 when access service denies (not owner, no grant)', async () => {
      mockConnectorRepository.findById.mockResolvedValue(makeConnector({ userId: 'other' }));
      mockAccessService.can.mockResolvedValue(false);

      await expect(
        service.createDraft('u1', {
          connectorId: 'c1',
          actionType: 'CREATE_ISSUE' as any,
          payload: { x: 1 },
          expiresInHours: 24,
        }),
      ).rejects.toThrow(BusinessException);
    });

    // v3 round 6 — granted user can create even when not owner
    it('should allow when access service approves (granted user)', async () => {
      mockConnectorRepository.findById.mockResolvedValue(makeConnector({ userId: 'other' }));
      mockAccessService.can.mockResolvedValue(true);
      mockActionRepository.create.mockResolvedValue({ id: 'a1' });
      mockActionRepository.findById.mockResolvedValue(makeAction());

      await expect(
        service.createDraft('u1', {
          connectorId: 'c1',
          actionType: 'CREATE_ISSUE' as any,
          payload: { x: 1 },
          expiresInHours: 24,
        }),
      ).resolves.toBeDefined();
      // Confirm the access service was asked the right question
      expect(mockAccessService.can).toHaveBeenCalledWith(
        'u1',
        'c1',
        'PROPOSE_AI_ACTION',
      );
    });

    it('should throw 403 when connector is READ-only', async () => {
      mockConnectorRepository.findById.mockResolvedValue(
        makeConnector({ permissionLevel: WorkspacePermissionLevel.READ }),
      );

      await expect(
        service.createDraft('u1', {
          connectorId: 'c1',
          actionType: 'CREATE_ISSUE' as any,
          payload: { x: 1 },
          expiresInHours: 24,
        }),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe('approve', () => {
    it('should transition to EXECUTING and trigger fire-and-forget execution', async () => {
      mockActionRepository.findById.mockResolvedValue(makeAction());
      const executing = makeAction({ status: WorkspaceActionStatus.EXECUTING });
      mockActionRepository.update.mockResolvedValueOnce(executing);
      mockExecutionManager.execute.mockResolvedValue({ success: true });
      mockActionRepository.update.mockResolvedValue(
        makeAction({ status: WorkspaceActionStatus.EXECUTED }),
      );

      const result = await service.approve('a1', 'u1');

      expect(result.status).toBe(WorkspaceActionStatus.EXECUTING);
      expect(mockRabbitMQ.publish).toHaveBeenCalled();
    });

    it('should throw 404 when action not found', async () => {
      mockActionRepository.findById.mockResolvedValue(null);

      await expect(service.approve('bad', 'u1')).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw CONFLICT when action is not PENDING', async () => {
      mockActionRepository.findById.mockResolvedValue(
        makeAction({ status: WorkspaceActionStatus.EXECUTED }),
      );

      await expect(service.approve('a1', 'u1')).rejects.toThrow(BusinessException);
    });

    it('should throw GONE when action is expired', async () => {
      mockActionRepository.findById.mockResolvedValue(
        makeAction({ expiresAt: new Date(Date.now() - 1000) }),
      );

      try {
        await service.approve('a1', 'u1');
        fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(BusinessException);
        expect((e as BusinessException).getStatus()).toBe(HttpStatus.GONE);
      }
    });
  });

  describe('reject', () => {
    it('should transition to REJECTED with reason', async () => {
      mockActionRepository.findById.mockResolvedValue(makeAction());
      mockActionRepository.update.mockResolvedValue(
        makeAction({ status: WorkspaceActionStatus.REJECTED }),
      );

      const result = await service.reject('a1', 'u1', { reason: 'Not needed' });

      expect(result.status).toBe(WorkspaceActionStatus.REJECTED);
      expect(mockRabbitMQ.publish).toHaveBeenCalled();
    });

    it('should throw CONFLICT when action already executed', async () => {
      mockActionRepository.findById.mockResolvedValue(
        makeAction({ status: WorkspaceActionStatus.EXECUTED }),
      );

      await expect(service.reject('a1', 'u1', {})).rejects.toThrow(BusinessException);
    });
  });

  describe('listActions', () => {
    it('should return paginated actions for user', async () => {
      const paginated = { data: [], total: 0, page: 1, pageSize: 20 };
      mockActionRepository.findAllByUser.mockResolvedValue(paginated);

      const result = await service.listActions('u1', { page: 1, pageSize: 20 });

      expect(result.total).toBe(0);
      expect(mockActionRepository.findAllByUser).toHaveBeenCalledWith('u1', {
        page: 1,
        pageSize: 20,
      });
    });
  });

  describe('approve — stale connector blocker', () => {
    it('blocks approve when connector is DEGRADED and publishes stale_blocked', async () => {
      mockActionRepository.findById.mockResolvedValue(
        makeAction({
          connector: { id: 'c1', name: 'X', provider: 'GMAIL', status: 'DEGRADED' },
        }),
      );

      await expect(service.approve('a1', 'u1')).rejects.toThrow(BusinessException);
      expect(mockRabbitMQ.publish).toHaveBeenCalledWith(
        'workspace_action.stale_blocked',
        expect.objectContaining({ actionId: 'a1', connectorStatus: 'DEGRADED' }),
      );
    });

    it('blocks approve when connector is PAUSED', async () => {
      mockActionRepository.findById.mockResolvedValue(
        makeAction({
          connector: { id: 'c1', name: 'X', provider: 'SLACK', status: 'PAUSED' },
        }),
      );
      await expect(service.approve('a1', 'u1')).rejects.toThrow(BusinessException);
    });

    it('blocks approve when connector is DISCONNECTED', async () => {
      mockActionRepository.findById.mockResolvedValue(
        makeAction({
          connector: { id: 'c1', name: 'X', provider: 'JIRA', status: 'DISCONNECTED' },
        }),
      );
      await expect(service.approve('a1', 'u1')).rejects.toThrow(BusinessException);
    });

    it('blocks approve when connector is PENDING_AUTH', async () => {
      mockActionRepository.findById.mockResolvedValue(
        makeAction({
          connector: { id: 'c1', name: 'X', provider: 'JIRA', status: 'PENDING_AUTH' },
        }),
      );
      await expect(service.approve('a1', 'u1')).rejects.toThrow(BusinessException);
    });
  });

  describe('editDraft', () => {
    it('increments draftHistory and transitions to EDITED', async () => {
      mockActionRepository.findById.mockResolvedValue(
        makeAction({ payload: { old: true }, draftHistory: [] }),
      );
      mockActionRepository.update.mockResolvedValue(
        makeAction({ status: WorkspaceActionStatus.EDITED, payload: { new: true } }),
      );

      const result = await service.editDraft('a1', 'u1', {
        payload: { new: true },
        editReason: 'clearer tone',
      });

      expect(result.status).toBe(WorkspaceActionStatus.EDITED);
      expect(mockActionRepository.update).toHaveBeenCalledWith(
        'a1',
        expect.objectContaining({
          status: WorkspaceActionStatus.EDITED,
          payload: { new: true },
          draftHistory: expect.arrayContaining([
            expect.objectContaining({ version: 1, payload: { old: true } }),
          ]),
        }),
      );
      expect(mockRabbitMQ.publish).toHaveBeenCalledWith(
        'workspace_action.edited',
        expect.objectContaining({ actionId: 'a1', newVersion: 1 }),
      );
    });

    it('rejects edit when action is EXECUTED', async () => {
      mockActionRepository.findById.mockResolvedValue(
        makeAction({ status: WorkspaceActionStatus.EXECUTED }),
      );

      await expect(service.editDraft('a1', 'u1', { payload: { x: 1 } })).rejects.toThrow(
        BusinessException,
      );
    });

    it('allows re-editing an EDITED action and increments version', async () => {
      mockActionRepository.findById.mockResolvedValue(
        makeAction({
          status: WorkspaceActionStatus.EDITED,
          payload: { v2: true },
          draftHistory: [{ version: 1, editedAt: 'x', editedBy: 'u1', payload: { v1: true } }],
        }),
      );
      mockActionRepository.update.mockResolvedValue(
        makeAction({ status: WorkspaceActionStatus.EDITED, payload: { v3: true } }),
      );

      await service.editDraft('a1', 'u1', { payload: { v3: true } });

      expect(mockActionRepository.update).toHaveBeenCalledWith(
        'a1',
        expect.objectContaining({
          draftHistory: expect.arrayContaining([
            expect.objectContaining({ version: 1 }),
            expect.objectContaining({ version: 2, payload: { v2: true } }),
          ]),
        }),
      );
    });
  });

  describe('bulkApprove', () => {
    it('approves every eligible action, skips blocked with reasons', async () => {
      const healthyConnector = { id: 'c1', name: 'X', provider: 'GMAIL', status: 'CONNECTED' };
      const staleConnector = { id: 'c2', name: 'Y', provider: 'SLACK', status: 'DEGRADED' };
      mockActionRepository.findManyByIds.mockResolvedValue([
        makeAction({ id: 'a1', connector: healthyConnector }),
        makeAction({ id: 'a2', connector: staleConnector }),
        makeAction({
          id: 'a3',
          connector: healthyConnector,
          status: WorkspaceActionStatus.EXECUTED,
        }),
      ]);
      mockActionRepository.update.mockResolvedValue(
        makeAction({ status: WorkspaceActionStatus.EXECUTING }),
      );
      mockActionRepository.findById.mockResolvedValue(
        makeAction({ status: WorkspaceActionStatus.EXECUTING }),
      );
      mockExecutionManager.execute.mockResolvedValue({ success: true });

      const outcome = await service.bulkApprove('u1', { actionIds: ['a1', 'a2', 'a3'] });

      expect(outcome.approvedActionIds).toEqual(['a1']);
      expect(outcome.blockedActionIds).toEqual(expect.arrayContaining(['a2', 'a3']));
      expect(outcome.blockedReasons['a2']).toMatch(/DEGRADED/);
      expect(outcome.blockedReasons['a3']).toMatch(/EXECUTED/);
      expect(mockRabbitMQ.publish).toHaveBeenCalledWith(
        'workspace_action.bulk_approved',
        expect.objectContaining({ total: 1, actionIds: ['a1'] }),
      );
    });

    it('produces a stable bulkGroupId shared by approved actions', async () => {
      mockActionRepository.findManyByIds.mockResolvedValue([
        makeAction({ id: 'a1' }),
        makeAction({ id: 'a2' }),
      ]);
      mockActionRepository.update.mockResolvedValue(
        makeAction({ status: WorkspaceActionStatus.EXECUTING }),
      );
      mockActionRepository.findById.mockResolvedValue(
        makeAction({ status: WorkspaceActionStatus.EXECUTING }),
      );
      mockExecutionManager.execute.mockResolvedValue({ success: true });

      const outcome = await service.bulkApprove('u1', { actionIds: ['a1', 'a2'] });

      expect(outcome.bulkGroupId).toMatch(/[0-9a-f-]{36}/);
      const updateCalls = (mockActionRepository.update as jest.Mock).mock.calls;
      const bulkIds = updateCalls
        .map((call) => call[1]?.bulkGroupId)
        .filter((v): v is string => Boolean(v));
      expect(new Set(bulkIds).size).toBe(1);
    });
  });
});
