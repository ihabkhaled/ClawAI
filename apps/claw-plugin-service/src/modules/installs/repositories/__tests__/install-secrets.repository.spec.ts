import { AuthKind } from '../../../../common/enums/auth-kind.enum';
import { RiskLevel } from '../../../../common/enums/risk-level.enum';
import { InstallSecretsRepository } from '../install-secrets.repository';

type ConsentUpsertArgs = {
  where: unknown;
  create: { toolName: string; level: string; grantedAt: Date };
  update: { level: string; grantedAt: Date };
};

function buildRepository() {
  const prisma = {
    pluginCredential: {
      upsert: vi.fn().mockResolvedValue({
        kind: 'API_KEY',
        updatedAt: new Date('2026-10-13T12:00:00.000Z'),
      }),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    pluginToolConsent: {
      upsert: vi.fn(async (args: ConsentUpsertArgs) => args.create),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
  return { prisma, repository: new InstallSecretsRepository(prisma as never) };
}

const INPUT = {
  userId: 'user-1',
  installId: 'install-1',
  kind: AuthKind.API_KEY,
  headerName: 'X-API-Key',
  ciphertext: 'sealed',
  keyVersion: 1,
};

describe('InstallSecretsRepository', () => {
  describe('saveCredential', () => {
    it('upserts one credential per install and selects only kind and time back', async () => {
      const { prisma, repository } = buildRepository();

      const saved = await repository.saveCredential(INPUT);

      const args = prisma.pluginCredential.upsert.mock.calls[0]?.[0];
      expect(args.where).toEqual({ installId: 'install-1' });
      expect(args.create).toMatchObject({
        userId: 'user-1',
        installId: 'install-1',
        ciphertext: 'sealed',
        keyVersion: 1,
        headerName: 'X-API-Key',
      });
      expect(args.update).toEqual({
        kind: 'API_KEY',
        headerName: 'X-API-Key',
        ciphertext: 'sealed',
        keyVersion: 1,
      });
      expect(args.select).toEqual({ kind: true, updatedAt: true });
      expect(saved).toEqual({
        kind: AuthKind.API_KEY,
        updatedAt: new Date('2026-10-13T12:00:00.000Z'),
      });
    });
  });

  describe('deleteCredential', () => {
    it('deletes by install AND owner', async () => {
      const { prisma, repository } = buildRepository();

      await expect(repository.deleteCredential('install-1', 'user-1')).resolves.toBe(true);
      expect(prisma.pluginCredential.deleteMany).toHaveBeenCalledWith({
        where: { installId: 'install-1', userId: 'user-1' },
      });
    });

    it('reports false when there was nothing to delete', async () => {
      const { prisma, repository } = buildRepository();
      prisma.pluginCredential.deleteMany.mockResolvedValue({ count: 0 });

      await expect(repository.deleteCredential('install-1', 'user-1')).resolves.toBe(false);
    });
  });

  describe('saveConsent', () => {
    it('upserts one grant per install and tool and refreshes the grant time', async () => {
      const { prisma, repository } = buildRepository();

      const saved = await repository.saveConsent('install-1', 'send', RiskLevel.WRITE);

      const args = prisma.pluginToolConsent.upsert.mock.calls[0]?.[0];
      if (args === undefined) throw new Error('upsert was not called');
      expect(args.where).toEqual({
        installId_toolName: { installId: 'install-1', toolName: 'send' },
      });
      expect(args.update.level).toBe('WRITE');
      expect(args.update.grantedAt).toBeInstanceOf(Date);
      expect(saved).toMatchObject({ toolName: 'send', level: RiskLevel.WRITE });
    });
  });

  describe('deleteConsent', () => {
    it('deletes the one grant for that install and tool', async () => {
      const { prisma, repository } = buildRepository();

      await expect(repository.deleteConsent('install-1', 'send')).resolves.toBe(true);
      expect(prisma.pluginToolConsent.deleteMany).toHaveBeenCalledWith({
        where: { installId: 'install-1', toolName: 'send' },
      });
    });

    it('reports false when there was no grant', async () => {
      const { prisma, repository } = buildRepository();
      prisma.pluginToolConsent.deleteMany.mockResolvedValue({ count: 0 });

      await expect(repository.deleteConsent('install-1', 'send')).resolves.toBe(false);
    });
  });
});
