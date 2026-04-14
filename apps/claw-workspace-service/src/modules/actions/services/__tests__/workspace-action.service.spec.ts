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

const mockActionRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findAllByUser: jest.fn(),
  update: jest.fn(),
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
  connector: { id: 'c1', name: 'My GitHub', provider: 'GITHUB' },
  ...overrides,
});

describe('WorkspaceActionService', () => {
  let service: WorkspaceActionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceActionService,
        { provide: WorkspaceActionRepository, useValue: mockActionRepository },
        { provide: WorkspaceConnectorRepository, useValue: mockConnectorRepository },
        { provide: ActionExecutionManager, useValue: mockExecutionManager },
        { provide: RabbitMQService, useValue: mockRabbitMQ },
      ],
    }).compile();

    service = module.get<WorkspaceActionService>(WorkspaceActionService);
    jest.clearAllMocks();
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

    it('should throw 403 when connector belongs to different user', async () => {
      mockConnectorRepository.findById.mockResolvedValue(makeConnector({ userId: 'other' }));

      await expect(
        service.createDraft('u1', {
          connectorId: 'c1',
          actionType: 'CREATE_ISSUE' as any,
          payload: { x: 1 },
          expiresInHours: 24,
        }),
      ).rejects.toThrow(BusinessException);
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
});
