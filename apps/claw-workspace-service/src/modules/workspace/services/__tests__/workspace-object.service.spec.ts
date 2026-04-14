import { WorkspaceObjectService } from '../workspace-object.service';
import { EntityNotFoundException } from '../../../../common/errors/entity-not-found.exception';
import { BusinessException } from '../../../../common/errors/business.exception';
import type { WorkspaceObjectRepository } from '../../repositories/workspace-object.repository';
import type { WorkspaceConnectorRepository } from '../../repositories/workspace-connector.repository';

const mockObjectRepository = {
  findByConnectorId: jest.fn(),
  findAllByUserId: jest.fn(),
  findById: jest.fn(),
} as unknown as WorkspaceObjectRepository;

const mockConnectorRepository = {
  findById: jest.fn(),
} as unknown as WorkspaceConnectorRepository;

const mockConnector = { id: 'conn1', userId: 'user1' };
const mockObject = { id: 'obj1', userId: 'user1', connectorId: 'conn1', sourceLinks: [] };
const mockPage = { data: [mockObject], total: 1, page: 1, pageSize: 20 };

describe('WorkspaceObjectService', () => {
  let service: WorkspaceObjectService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WorkspaceObjectService(mockObjectRepository, mockConnectorRepository);
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

    it('should throw BusinessException when connector belongs to another user', async () => {
      (mockConnectorRepository.findById as jest.Mock).mockResolvedValue({
        id: 'conn1',
        userId: 'other-user',
      });
      await expect(
        service.listObjects('user1', { page: 1, limit: 20, connectorId: 'conn1' }),
      ).rejects.toBeInstanceOf(BusinessException);
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
});
