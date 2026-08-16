import { Test, type TestingModule } from '@nestjs/testing';
import {
  BillingModel,
  RouterChainEntryRole,
  RouterConfigurationStatus,
  RouterProvider,
} from '../../../generated/prisma';
import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import { RouterConfigurationRepository } from '../../routing/repositories/router-configuration.repository';
import { RouterConfigurationAdminService } from '../services/router-configuration-admin.service';
import type { RouterConfigurationDetail } from '../types/router-configuration-admin.types';
import type { UpdateChainEntriesDto } from '../dto/update-chain-entries.dto';

const detail = (overrides: Partial<RouterConfigurationDetail> = {}): RouterConfigurationDetail => ({
  id: 'config_1',
  scope: 'GLOBAL',
  revision: 1,
  status: RouterConfigurationStatus.DRAFT,
  mode: 'CLOUD_FIRST' as never,
  enabled: false,
  totalDeadlineMs: 5000,
  maxAttempts: 6,
  maxRouterInputTokens: 1800,
  maxRouterOutputTokens: 320,
  minConfidence: 0.75,
  lowConfidenceAction: 'QUALITY_ESCALATION_THEN_DETERMINISTIC' as never,
  failClosedWhenNoEligibleRouter: true,
  skipProviderOnProviderWideFailure: true,
  safeTraceLevel: 'DETAILED_FACTORS',
  legacyLocalRollbackEnabled: true,
  supersedesRevision: null,
  publishedAt: null,
  publishedBy: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  entries: [],
  ...overrides,
});

describe('RouterConfigurationAdminService', () => {
  let service: RouterConfigurationAdminService;
  let repository: jest.Mocked<RouterConfigurationRepository>;

  beforeEach(async () => {
    repository = {
      listRevisions: jest.fn(),
      findRevisionById: jest.fn(),
      findPublishedRevision: jest.fn(),
      createDraft: jest.fn(),
      replaceEntries: jest.fn(),
      updateFields: jest.fn(),
      publish: jest.fn(),
      setEnabled: jest.fn(),
    } as unknown as jest.Mocked<RouterConfigurationRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouterConfigurationAdminService,
        { provide: RouterConfigurationRepository, useValue: repository },
      ],
    }).compile();

    service = module.get<RouterConfigurationAdminService>(RouterConfigurationAdminService);
  });

  describe('list', () => {
    it('paginates with skip derived from page/limit', async () => {
      repository.listRevisions.mockResolvedValue({ items: [], total: 45 });

      const result = await service.list({ scope: 'GLOBAL', page: 3, limit: 10 });

      expect(repository.listRevisions).toHaveBeenCalledWith(
        expect.objectContaining({ scope: 'GLOBAL', skip: 20, take: 10 }),
      );
      expect(result.meta).toEqual({ total: 45, page: 3, limit: 10, totalPages: 5 });
    });
  });

  describe('getById', () => {
    it('throws EntityNotFoundException when missing', async () => {
      repository.findRevisionById.mockResolvedValue(null);
      await expect(service.getById('missing')).rejects.toThrow(EntityNotFoundException);
    });

    it('returns the revision when found', async () => {
      repository.findRevisionById.mockResolvedValue(detail());
      await expect(service.getById('config_1')).resolves.toEqual(detail());
    });
  });

  describe('createDraft', () => {
    it('delegates scope to the repository', async () => {
      repository.createDraft.mockResolvedValue(detail());
      await service.createDraft({ scope: 'GLOBAL' });
      expect(repository.createDraft).toHaveBeenCalledWith('GLOBAL');
    });
  });

  describe('updateEntries', () => {
    const entriesDto: UpdateChainEntriesDto = {
      entries: [
        {
          role: RouterChainEntryRole.PRIMARY,
          provider: RouterProvider.GEMINI,
          modelAlias: 'gemini-2.5-flash',
          enabled: true,
          attemptTimeoutMs: 1600,
          retries: 0,
          triggers: [],
          skipWhenProviderCircuitOpen: true,
          billingModel: BillingModel.UNKNOWN,
        },
      ],
    };

    it('rejects editing a revision that is not DRAFT', async () => {
      repository.findRevisionById.mockResolvedValue(
        detail({ status: RouterConfigurationStatus.PUBLISHED }),
      );

      await expect(service.updateEntries('config_1', entriesDto)).rejects.toThrow(
        BusinessException,
      );
      expect(repository.replaceEntries).not.toHaveBeenCalled();
    });

    it('replaces entries on a DRAFT revision', async () => {
      repository.findRevisionById.mockResolvedValue(detail());
      repository.replaceEntries.mockResolvedValue(detail());

      await service.updateEntries('config_1', entriesDto);

      expect(repository.replaceEntries).toHaveBeenCalledWith(
        'config_1',
        expect.arrayContaining([expect.objectContaining({ modelAlias: 'gemini-2.5-flash' })]),
      );
    });

    it('throws EntityNotFoundException if the revision vanished mid-request', async () => {
      repository.findRevisionById.mockResolvedValue(detail());
      repository.replaceEntries.mockResolvedValue(null);

      await expect(service.updateEntries('config_1', entriesDto)).rejects.toThrow(
        EntityNotFoundException,
      );
    });
  });

  describe('updateFields', () => {
    it('rejects editing a revision that is not DRAFT', async () => {
      repository.findRevisionById.mockResolvedValue(
        detail({ status: RouterConfigurationStatus.PUBLISHED }),
      );

      await expect(service.updateFields('config_1', { totalDeadlineMs: 15_000 })).rejects.toThrow(
        BusinessException,
      );
      expect(repository.updateFields).not.toHaveBeenCalled();
    });

    it('updates a DRAFT revision', async () => {
      repository.findRevisionById.mockResolvedValue(detail());
      repository.updateFields.mockResolvedValue(detail({ totalDeadlineMs: 15_000 }));

      const result = await service.updateFields('config_1', { totalDeadlineMs: 15_000 });

      expect(repository.updateFields).toHaveBeenCalledWith('config_1', { totalDeadlineMs: 15_000 });
      expect(result.totalDeadlineMs).toBe(15_000);
    });

    it('throws EntityNotFoundException if the revision vanished mid-request', async () => {
      repository.findRevisionById.mockResolvedValue(detail());
      repository.updateFields.mockResolvedValue(null);

      await expect(service.updateFields('config_1', { totalDeadlineMs: 15_000 })).rejects.toThrow(
        EntityNotFoundException,
      );
    });
  });

  describe('publish', () => {
    it('rejects publishing a revision that is not DRAFT', async () => {
      repository.findRevisionById.mockResolvedValue(
        detail({ status: RouterConfigurationStatus.SUPERSEDED }),
      );

      await expect(service.publish('config_1', 'user_1')).rejects.toThrow(BusinessException);
      expect(repository.publish).not.toHaveBeenCalled();
    });

    it('publishes a DRAFT revision', async () => {
      repository.findRevisionById.mockResolvedValue(detail());
      repository.publish.mockResolvedValue(detail({ status: RouterConfigurationStatus.PUBLISHED }));

      const result = await service.publish('config_1', 'user_1');

      expect(repository.publish).toHaveBeenCalledWith('config_1', 'user_1');
      expect(result.status).toBe(RouterConfigurationStatus.PUBLISHED);
    });

    it('surfaces a race between the pre-check and the atomic publish as a conflict', async () => {
      repository.findRevisionById.mockResolvedValue(detail());
      repository.publish.mockResolvedValue(null);

      await expect(service.publish('config_1', 'user_1')).rejects.toThrow(BusinessException);
    });
  });

  describe('setEnabled', () => {
    it('throws when no revision is PUBLISHED for the scope', async () => {
      repository.setEnabled.mockResolvedValue(null);
      await expect(service.setEnabled('GLOBAL', true)).rejects.toThrow(BusinessException);
    });

    it('returns the updated revision on success', async () => {
      repository.setEnabled.mockResolvedValue(detail({ enabled: true }));
      const result = await service.setEnabled('GLOBAL', true);
      expect(result.enabled).toBe(true);
    });
  });
});
