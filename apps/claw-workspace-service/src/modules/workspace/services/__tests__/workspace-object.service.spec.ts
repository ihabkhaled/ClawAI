import { WorkspaceObjectService } from '../workspace-object.service';
import { EntityNotFoundException } from '../../../../common/errors/entity-not-found.exception';
import { BusinessException } from '../../../../common/errors/business.exception';
import type { WorkspaceObjectRepository } from '../../repositories/workspace-object.repository';
import type { WorkspaceConnectorRepository } from '../../repositories/workspace-connector.repository';
import type { WorkspaceAdapterFactory } from '../../adapters/workspace-adapter.factory';
import type { OAuthTokenManager } from '../../managers/oauth-token.manager';
import type { ConnectorAccessService } from '../../../connector-access/services/connector-access.service';

const mockObjectRepository = {
  findByConnectorId: jest.fn(),
  findByConnectorIdForAuthorizedUser: jest.fn(),
  findAllByUserId: jest.fn(),
  findById: jest.fn(),
  findByIdForAuthorizedUser: jest.fn(),
  upsert: jest.fn(),
} as unknown as WorkspaceObjectRepository;

const mockAccessService = {
  can: jest.fn().mockResolvedValue(true),
} as unknown as ConnectorAccessService;

const mockConnectorRepository = {
  findById: jest.fn(),
  findSyncRunsByConnectorId: jest.fn(),
  findHealthEventsByConnectorId: jest.fn(),
} as unknown as WorkspaceConnectorRepository;

const mockAdapterFactory = {
  getAdapter: jest.fn(),
} as unknown as WorkspaceAdapterFactory;

const mockTokenManager = {
  decryptTokenSet: jest.fn(),
} as unknown as OAuthTokenManager;

const mockConnector = { id: 'conn1', userId: 'user1' };
const mockObject = { id: 'obj1', userId: 'user1', connectorId: 'conn1', sourceLinks: [] };
const mockPage = { data: [mockObject], total: 1, page: 1, pageSize: 20 };

describe('WorkspaceObjectService', () => {
  let service: WorkspaceObjectService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WorkspaceObjectService(
      mockObjectRepository,
      mockConnectorRepository,
      mockAdapterFactory,
      mockTokenManager,
      mockAccessService,
    );
    // Default: any caller is allowed to view. Individual tests override.
    (mockAccessService.can as jest.Mock).mockResolvedValue(true);
  });

  describe('listObjects', () => {
    it('should list all objects for a user when no connectorId filter', async () => {
      (mockObjectRepository.findAllByUserId as jest.Mock).mockResolvedValue(mockPage);
      const result = await service.listObjects('user1', { page: 1, limit: 20 });
      expect(result).toEqual(mockPage);
      expect(mockObjectRepository.findAllByUserId).toHaveBeenCalledWith('user1', 1, 20, undefined);
    });

    it('should filter by connectorId when provided', async () => {
      (mockConnectorRepository.findById as jest.Mock).mockResolvedValue(mockConnector);
      (mockObjectRepository.findByConnectorId as jest.Mock).mockResolvedValue(mockPage);
      const result = await service.listObjects('user1', {
        page: 1,
        limit: 20,
        connectorId: 'conn1',
      });
      expect(result).toEqual(mockPage);
    });

    it('should throw EntityNotFoundException when connector not found', async () => {
      (mockConnectorRepository.findById as jest.Mock).mockResolvedValue(null);
      await expect(
        service.listObjects('user1', { page: 1, limit: 20, connectorId: 'missing' }),
      ).rejects.toBeInstanceOf(EntityNotFoundException);
    });

    it('should throw BusinessException when access service denies (not owner, no grant)', async () => {
      (mockConnectorRepository.findById as jest.Mock).mockResolvedValue({
        id: 'conn1',
        userId: 'other-user',
      });
      (mockAccessService.can as jest.Mock).mockResolvedValue(false);
      await expect(
        service.listObjects('user1', { page: 1, limit: 20, connectorId: 'conn1' }),
      ).rejects.toBeInstanceOf(BusinessException);
    });

    // v3 round 8 — granted user can list a non-owner connector's objects
    it('should list objects for a grantee using the no-userId repo path', async () => {
      (mockConnectorRepository.findById as jest.Mock).mockResolvedValue({
        id: 'conn1',
        userId: 'other-user',
      });
      (mockAccessService.can as jest.Mock).mockResolvedValue(true);
      (mockObjectRepository.findByConnectorIdForAuthorizedUser as jest.Mock).mockResolvedValue(
        mockPage,
      );
      const result = await service.listObjects('grantee', {
        page: 1,
        limit: 20,
        connectorId: 'conn1',
      });
      expect(result).toEqual(mockPage);
      expect(mockObjectRepository.findByConnectorIdForAuthorizedUser).toHaveBeenCalledWith(
        'conn1',
        1,
        20,
        undefined,
      );
      // Legacy owner-path NOT taken for the grantee
      expect(mockObjectRepository.findByConnectorId).not.toHaveBeenCalled();
    });
  });

  describe('getObject', () => {
    it('should return object when found', async () => {
      (mockObjectRepository.findById as jest.Mock).mockResolvedValue(mockObject);
      const result = await service.getObject('obj1', 'user1');
      expect(result).toEqual(mockObject);
    });

    it('should throw EntityNotFoundException when object not found', async () => {
      (mockObjectRepository.findById as jest.Mock).mockResolvedValue(null);
      await expect(service.getObject('missing', 'user1')).rejects.toBeInstanceOf(
        EntityNotFoundException,
      );
    });
  });

  describe('refreshObject', () => {
    const objWithExt = {
      ...mockObject,
      externalId: 'ext-1',
      type: 'REPOSITORY',
      title: 'old title',
    };
    const connectedConnector = {
      ...mockConnector,
      provider: 'GITHUB',
      encryptedTokens: 'enc',
    };

    it('throws when object is missing', async () => {
      (mockObjectRepository.findById as jest.Mock).mockResolvedValue(null);
      await expect(service.refreshObject('missing', 'user1')).rejects.toBeInstanceOf(
        EntityNotFoundException,
      );
    });

    it('throws when connector has no tokens', async () => {
      (mockObjectRepository.findById as jest.Mock).mockResolvedValue(objWithExt);
      (mockConnectorRepository.findById as jest.Mock).mockResolvedValue({
        ...connectedConnector,
        encryptedTokens: null,
      });
      await expect(service.refreshObject('obj1', 'user1')).rejects.toBeInstanceOf(
        BusinessException,
      );
    });

    it('throws when adapter does not implement fetchObjectDetails', async () => {
      (mockObjectRepository.findById as jest.Mock).mockResolvedValue(objWithExt);
      (mockConnectorRepository.findById as jest.Mock).mockResolvedValue(connectedConnector);
      (mockTokenManager.decryptTokenSet as jest.Mock).mockReturnValue({ accessToken: 't' });
      (mockAdapterFactory.getAdapter as jest.Mock).mockReturnValue({});
      await expect(service.refreshObject('obj1', 'user1')).rejects.toBeInstanceOf(
        BusinessException,
      );
    });

    it('throws GONE when adapter returns null', async () => {
      (mockObjectRepository.findById as jest.Mock).mockResolvedValue(objWithExt);
      (mockConnectorRepository.findById as jest.Mock).mockResolvedValue(connectedConnector);
      (mockTokenManager.decryptTokenSet as jest.Mock).mockReturnValue({ accessToken: 't' });
      (mockAdapterFactory.getAdapter as jest.Mock).mockReturnValue({
        fetchObjectDetails: jest.fn().mockResolvedValue(null),
      });
      await expect(service.refreshObject('obj1', 'user1')).rejects.toBeInstanceOf(
        BusinessException,
      );
    });

    it('upserts fresh details on success', async () => {
      (mockObjectRepository.findById as jest.Mock).mockResolvedValue(objWithExt);
      (mockConnectorRepository.findById as jest.Mock).mockResolvedValue(connectedConnector);
      (mockTokenManager.decryptTokenSet as jest.Mock).mockReturnValue({ accessToken: 't' });
      (mockAdapterFactory.getAdapter as jest.Mock).mockReturnValue({
        fetchObjectDetails: jest.fn().mockResolvedValue({
          externalId: 'ext-1',
          title: 'new title',
          content: 'fresh',
          url: null,
          authorId: null,
          externalCreatedAt: null,
          externalUpdatedAt: null,
          metadata: { stars: 42 },
        }),
      });
      (mockObjectRepository.upsert as jest.Mock).mockResolvedValue({
        ...objWithExt,
        title: 'new title',
      });
      const result = await service.refreshObject('obj1', 'user1');
      expect(mockObjectRepository.upsert).toHaveBeenCalled();
      expect(result.title).toBe('new title');
    });
  });

  describe('listSyncRuns', () => {
    it('returns recent runs for an owned connector', async () => {
      (mockConnectorRepository.findById as jest.Mock).mockResolvedValue(mockConnector);
      (mockConnectorRepository.findSyncRunsByConnectorId as jest.Mock).mockResolvedValue([
        { id: 'r1' },
      ]);
      const result = await service.listSyncRuns('conn1', 'user1', 10);
      expect(result).toHaveLength(1);
      expect(mockConnectorRepository.findSyncRunsByConnectorId).toHaveBeenCalledWith('conn1', 10);
    });

    it('throws forbidden when access service denies', async () => {
      (mockConnectorRepository.findById as jest.Mock).mockResolvedValue({
        id: 'conn1',
        userId: 'other',
      });
      (mockAccessService.can as jest.Mock).mockResolvedValue(false);
      await expect(service.listSyncRuns('conn1', 'user1', 10)).rejects.toBeInstanceOf(
        BusinessException,
      );
    });
  });

  describe('listHealthEvents', () => {
    it('returns recent events for an owned connector', async () => {
      (mockConnectorRepository.findById as jest.Mock).mockResolvedValue(mockConnector);
      (mockConnectorRepository.findHealthEventsByConnectorId as jest.Mock).mockResolvedValue([
        { id: 'e1' },
        { id: 'e2' },
      ]);
      const result = await service.listHealthEvents('conn1', 'user1', 20);
      expect(result).toHaveLength(2);
      expect(mockConnectorRepository.findHealthEventsByConnectorId).toHaveBeenCalledWith(
        'conn1',
        20,
      );
    });

    it('throws forbidden when access service denies', async () => {
      (mockConnectorRepository.findById as jest.Mock).mockResolvedValue({
        id: 'conn1',
        userId: 'other',
      });
      (mockAccessService.can as jest.Mock).mockResolvedValue(false);
      await expect(service.listHealthEvents('conn1', 'user1', 10)).rejects.toBeInstanceOf(
        BusinessException,
      );
    });
  });

  // v3 round 11 (Prompt 08) — file content download
  describe('downloadObjectContent', () => {
    const fileStream = {
      filename: 'report.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      body: {} as ReadableStream<Uint8Array>,
    };

    it('streams content for an authorized user', async () => {
      (mockObjectRepository.findByIdForAuthorizedUser as jest.Mock).mockResolvedValue({
        id: 'obj1',
        connectorId: 'conn1',
        externalId: 'file-abc',
        metadata: { name: 'report.pdf' },
      });
      (mockAccessService.can as jest.Mock).mockResolvedValue(true);
      (mockConnectorRepository.findById as jest.Mock).mockResolvedValue({
        id: 'conn1',
        provider: 'GOOGLE_DRIVE',
        encryptedTokens: 'enc',
      });
      (mockTokenManager.decryptTokenSet as jest.Mock).mockReturnValue({ accessToken: 'tok' });
      const downloadFileContent = jest.fn().mockResolvedValue(fileStream);
      (mockAdapterFactory.getAdapter as jest.Mock).mockReturnValue({ downloadFileContent });

      const result = await service.downloadObjectContent('obj1', 'user1');
      expect(result).toEqual(fileStream);
      expect(downloadFileContent).toHaveBeenCalledWith('tok', 'file-abc', {
        name: 'report.pdf',
      });
    });

    it('404s when the object does not exist', async () => {
      (mockObjectRepository.findByIdForAuthorizedUser as jest.Mock).mockResolvedValue(null);
      await expect(service.downloadObjectContent('missing', 'user1')).rejects.toBeInstanceOf(
        EntityNotFoundException,
      );
    });

    it('403s when the access service denies', async () => {
      (mockObjectRepository.findByIdForAuthorizedUser as jest.Mock).mockResolvedValue({
        id: 'obj1',
        connectorId: 'conn1',
        externalId: 'file-abc',
        metadata: {},
      });
      (mockAccessService.can as jest.Mock).mockResolvedValue(false);
      await expect(service.downloadObjectContent('obj1', 'user1')).rejects.toBeInstanceOf(
        BusinessException,
      );
    });

    it('501s when the adapter has no downloadFileContent implementation', async () => {
      (mockObjectRepository.findByIdForAuthorizedUser as jest.Mock).mockResolvedValue({
        id: 'obj1',
        connectorId: 'conn1',
        externalId: 'file-abc',
        metadata: {},
      });
      (mockAccessService.can as jest.Mock).mockResolvedValue(true);
      (mockConnectorRepository.findById as jest.Mock).mockResolvedValue({
        id: 'conn1',
        provider: 'SLACK',
        encryptedTokens: 'enc',
      });
      (mockAdapterFactory.getAdapter as jest.Mock).mockReturnValue({});
      await expect(service.downloadObjectContent('obj1', 'user1')).rejects.toBeInstanceOf(
        BusinessException,
      );
    });

    it('410s when the provider reports the file is gone', async () => {
      (mockObjectRepository.findByIdForAuthorizedUser as jest.Mock).mockResolvedValue({
        id: 'obj1',
        connectorId: 'conn1',
        externalId: 'file-abc',
        metadata: {},
      });
      (mockAccessService.can as jest.Mock).mockResolvedValue(true);
      (mockConnectorRepository.findById as jest.Mock).mockResolvedValue({
        id: 'conn1',
        provider: 'GOOGLE_DRIVE',
        encryptedTokens: 'enc',
      });
      (mockTokenManager.decryptTokenSet as jest.Mock).mockReturnValue({ accessToken: 'tok' });
      (mockAdapterFactory.getAdapter as jest.Mock).mockReturnValue({
        downloadFileContent: jest.fn().mockResolvedValue(null),
      });
      await expect(service.downloadObjectContent('obj1', 'user1')).rejects.toBeInstanceOf(
        BusinessException,
      );
    });
  });
});
