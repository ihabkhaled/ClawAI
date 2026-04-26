import { Test, type TestingModule } from '@nestjs/testing';
import { ActionExecutionManager } from '../action-execution.manager';
import { WorkspaceAdapterFactory } from '../../../workspace/adapters/workspace-adapter.factory';
import { TokenRefreshManager } from '../../../workspace/managers/token-refresh.manager';
import { WorkspaceConnectorRepository } from '../../../workspace/repositories/workspace-connector.repository';
import type { WorkspaceActionWithConnector } from '../../types/action.types';

const mockAdapter = {
  supportsWrite: jest.fn().mockReturnValue(true),
  executeWriteAction: jest.fn(),
};

const mockAdapterFactory = {
  getAdapter: jest.fn().mockReturnValue(mockAdapter),
};

const mockTokenManager = {
  getValidAccessToken: jest.fn().mockResolvedValue('tok123'),
};

const mockConnectorRepository = {
  findById: jest.fn().mockResolvedValue({ id: 'c1', encryptedTokens: 'enc' }),
};

const makeAction = (overrides = {}): WorkspaceActionWithConnector =>
  ({
    id: 'a1',
    connectorId: 'c1',
    userId: 'u1',
    actionType: 'CREATE_ISSUE',
    payload: { owner: 'org', repo: 'repo', title: 'Test' },
    status: 'PENDING_APPROVAL',
    connector: { id: 'c1', name: 'My GitHub', provider: 'GITHUB' },
    ...overrides,
  }) as unknown as WorkspaceActionWithConnector;

describe('ActionExecutionManager', () => {
  let manager: ActionExecutionManager;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActionExecutionManager,
        { provide: WorkspaceAdapterFactory, useValue: mockAdapterFactory },
        { provide: TokenRefreshManager, useValue: mockTokenManager },
        { provide: WorkspaceConnectorRepository, useValue: mockConnectorRepository },
      ],
    }).compile();

    manager = module.get<ActionExecutionManager>(ActionExecutionManager);
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return success result when adapter executes successfully', async () => {
      mockConnectorRepository.findById.mockResolvedValue({ id: 'c1', encryptedTokens: 'enc' });
      mockTokenManager.getValidAccessToken.mockResolvedValue('tok');
      mockAdapter.supportsWrite.mockReturnValue(true);
      mockAdapter.executeWriteAction.mockResolvedValue({
        success: true,
        externalId: '42',
        url: 'https://github.com/issue/42',
      });

      const result = await manager.execute(makeAction());

      expect(result.success).toBe(true);
      expect(result.externalId).toBe('42');
    });

    it('should return failure when adapter does not support write', async () => {
      mockAdapter.supportsWrite.mockReturnValue(false);

      const result = await manager.execute(makeAction());

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('does not support write actions');
    });

    it('should return failure when connector has no tokens', async () => {
      mockAdapter.supportsWrite.mockReturnValue(true);
      mockAdapterFactory.getAdapter.mockReturnValue(mockAdapter);
      mockConnectorRepository.findById.mockResolvedValue({ id: 'c1', encryptedTokens: null });

      const result = await manager.execute(makeAction());

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Could not resolve access token');
    });

    it('should return failure when connector not found', async () => {
      mockConnectorRepository.findById.mockResolvedValue(null);

      const result = await manager.execute(makeAction());

      expect(result.success).toBe(false);
    });

    it('should return failure when adapter throws', async () => {
      mockConnectorRepository.findById.mockResolvedValue({ id: 'c1', encryptedTokens: 'enc' });
      mockAdapter.supportsWrite.mockReturnValue(true);
      mockAdapter.executeWriteAction.mockRejectedValue(new Error('Network timeout'));

      const result = await manager.execute(makeAction());

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('Network timeout');
    });
  });
});
