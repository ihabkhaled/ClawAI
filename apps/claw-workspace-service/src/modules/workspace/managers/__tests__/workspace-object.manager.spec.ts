import { WorkspaceObjectManager } from '../workspace-object.manager';
import type { WorkspaceObjectRepository } from '../../repositories/workspace-object.repository';
import { WorkspaceObjectType } from '../../../../common/enums/workspace-object-type.enum';

const mockRepository = {
  upsert: jest.fn(),
  createLink: jest.fn(),
  resolveLinksByExternalRef: jest.fn(),
} as unknown as WorkspaceObjectRepository;

describe('WorkspaceObjectManager', () => {
  let manager: WorkspaceObjectManager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new WorkspaceObjectManager(mockRepository);
  });

  describe('upsertBatch', () => {
    it('should upsert all objects and return count', async () => {
      (mockRepository.upsert as jest.Mock).mockResolvedValue({ id: 'obj1' });
      const objects = [
        {
          externalId: 'ext1',
          type: WorkspaceObjectType.REPOSITORY,
          title: 'my-repo',
        },
        {
          externalId: 'ext2',
          type: WorkspaceObjectType.ISSUE,
          title: 'bug fix',
        },
      ];
      const result = await manager.upsertBatch('c1', 'u1', 'GITHUB', objects);
      expect(result.synced).toBe(2);
      expect(result.objects).toHaveLength(2);
      expect(mockRepository.upsert).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures and return synced count', async () => {
      (mockRepository.upsert as jest.Mock)
        .mockResolvedValueOnce({ id: 'obj1' })
        .mockRejectedValueOnce(new Error('DB error'));
      const objects = [
        { externalId: 'ext1', type: WorkspaceObjectType.REPOSITORY, title: 'ok' },
        { externalId: 'ext2', type: WorkspaceObjectType.REPOSITORY, title: 'fail' },
      ];
      const result = await manager.upsertBatch('c1', 'u1', 'GITHUB', objects);
      expect(result.synced).toBe(1);
      expect(result.objects).toHaveLength(1);
    });

    it('should return 0 for empty objects array', async () => {
      const result = await manager.upsertBatch('c1', 'u1', 'GITHUB', []);
      expect(result.synced).toBe(0);
      expect(result.objects).toEqual([]);
      expect(mockRepository.upsert).not.toHaveBeenCalled();
    });

    it('should truncate content longer than max length', async () => {
      (mockRepository.upsert as jest.Mock).mockResolvedValue({ id: 'obj1' });
      const longContent = 'a'.repeat(70_000);
      const objects = [
        {
          externalId: 'ext1',
          type: WorkspaceObjectType.DOCUMENT,
          title: 'doc',
          content: longContent,
        },
      ];
      await manager.upsertBatch('c1', 'u1', 'GOOGLE_DRIVE', objects);
      const callArg = (mockRepository.upsert as jest.Mock).mock.calls[0][3];
      expect(callArg.content).toHaveLength(65_536);
    });
  });

  describe('detectAndCreateLinks', () => {
    it('should detect Jira references and create links', async () => {
      (mockRepository.createLink as jest.Mock).mockImplementation(() => Promise.resolve());
      const objects = [
        {
          id: 'obj1',
          content: 'This fixes PROJ-123 and resolves PROJ-456',
        },
      ] as Parameters<typeof manager.detectAndCreateLinks>[0];
      await manager.detectAndCreateLinks(objects);
      expect(mockRepository.createLink).toHaveBeenCalledWith(
        'obj1',
        'PROJ-123',
        'JIRA_REFERENCE',
        undefined,
        0.9,
      );
      expect(mockRepository.createLink).toHaveBeenCalledWith(
        'obj1',
        'PROJ-456',
        'JIRA_REFERENCE',
        undefined,
        0.9,
      );
    });

    it('should detect GitHub PR URL references', async () => {
      (mockRepository.createLink as jest.Mock).mockImplementation(() => Promise.resolve());
      const objects = [
        {
          id: 'obj2',
          content: 'See https://github.com/org/repo/pull/42 for details',
        },
      ] as Parameters<typeof manager.detectAndCreateLinks>[0];
      await manager.detectAndCreateLinks(objects);
      expect(mockRepository.createLink).toHaveBeenCalledWith(
        'obj2',
        'https://github.com/org/repo/pull/42',
        'GITHUB_PR_REFERENCE',
        undefined,
        0.95,
      );
    });

    it('should skip objects with null content', async () => {
      const objects = [{ id: 'obj3', content: null }] as Parameters<
        typeof manager.detectAndCreateLinks
      >[0];
      await manager.detectAndCreateLinks(objects);
      expect(mockRepository.createLink).not.toHaveBeenCalled();
    });

    it('should silently skip link creation on error', async () => {
      (mockRepository.createLink as jest.Mock).mockRejectedValue(new Error('DB constraint'));
      const objects = [{ id: 'obj4', content: 'PROJ-999' }] as Parameters<
        typeof manager.detectAndCreateLinks
      >[0];
      await expect(manager.detectAndCreateLinks(objects)).resolves.toBeUndefined();
    });
  });

  describe('resolveLinksForObjects', () => {
    it('resolves GitHub reference links by the object url', async () => {
      const objects = [
        {
          id: 'obj-pr',
          url: 'https://github.com/org/repo/pull/42',
          provider: 'GITHUB',
          metadata: {},
        },
      ] as unknown as Parameters<typeof manager.resolveLinksForObjects>[0];
      await manager.resolveLinksForObjects(objects);
      expect(mockRepository.resolveLinksByExternalRef).toHaveBeenCalledWith(
        'https://github.com/org/repo/pull/42',
        ['GITHUB_PR_REFERENCE', 'GITHUB_ISSUE_REFERENCE'],
        'obj-pr',
      );
    });

    it('resolves Jira reference links by metadata.issueKey for JIRA-provider objects', async () => {
      const objects = [
        { id: 'obj-jira', url: null, provider: 'JIRA', metadata: { issueKey: 'PROJ-123' } },
      ] as unknown as Parameters<typeof manager.resolveLinksForObjects>[0];
      await manager.resolveLinksForObjects(objects);
      expect(mockRepository.resolveLinksByExternalRef).toHaveBeenCalledWith(
        'PROJ-123',
        ['JIRA_REFERENCE'],
        'obj-jira',
      );
    });

    it('does not attempt Jira resolution for a non-Jira object even with an issueKey-shaped metadata field', async () => {
      const objects = [
        { id: 'obj-x', url: null, provider: 'GITHUB', metadata: { issueKey: 'PROJ-123' } },
      ] as unknown as Parameters<typeof manager.resolveLinksForObjects>[0];
      await manager.resolveLinksForObjects(objects);
      expect(mockRepository.resolveLinksByExternalRef).not.toHaveBeenCalled();
    });

    it('skips url resolution when url is null and skips Jira resolution when issueKey is missing', async () => {
      const objects = [
        { id: 'obj-none', url: null, provider: 'JIRA', metadata: {} },
      ] as unknown as Parameters<typeof manager.resolveLinksForObjects>[0];
      await manager.resolveLinksForObjects(objects);
      expect(mockRepository.resolveLinksByExternalRef).not.toHaveBeenCalled();
    });

    it('can resolve both a url-based and a Jira-based reference for the same object', async () => {
      const objects = [
        {
          id: 'obj-both',
          url: 'https://github.com/org/repo/issues/7',
          provider: 'JIRA',
          metadata: { issueKey: 'PROJ-9' },
        },
      ] as unknown as Parameters<typeof manager.resolveLinksForObjects>[0];
      await manager.resolveLinksForObjects(objects);
      expect(mockRepository.resolveLinksByExternalRef).toHaveBeenCalledTimes(2);
    });
  });
});
