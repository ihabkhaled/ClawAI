import { CatalogStatus } from '../../../common/enums/catalog-status.enum';
import { AuthKind } from '../../../common/enums/auth-kind.enum';
import { parsePluginManifest } from '../../catalog/utilities/parse-plugin-manifest.utility';
import { CURATED_SEEDS, UNVERIFIED_SERVER_URL } from '../constants/curated-seeds.constants';
import { CuratedManifestManager } from '../managers/curated-manifest.manager';
import { AdminAuditService } from '../services/admin-audit.service';
import { CuratedSeederService } from '../services/curated-seeder.service';
import { FakeCuratedRepository } from './curation-fixtures';

function build() {
  const repository = new FakeCuratedRepository();
  const auditRepository = { write: vi.fn().mockResolvedValue(undefined) };
  const seeder = new CuratedSeederService(
    repository as never,
    new CuratedManifestManager(),
    new AdminAuditService(auditRepository as never),
  );
  return { seeder, repository, auditRepository };
}

describe('admin catalog seed: CuratedSeederService', () => {
  it('seeds 12 to 15 curated remote entries, all unique and all valid manifests', async () => {
    const { seeder, repository } = build();

    const summary = await seeder.seed();

    expect(CURATED_SEEDS.length).toBeGreaterThanOrEqual(12);
    expect(CURATED_SEEDS.length).toBeLessThanOrEqual(15);
    expect(new Set(CURATED_SEEDS.map((seed) => seed.slug)).size).toBe(CURATED_SEEDS.length);
    expect(summary.created).toHaveLength(CURATED_SEEDS.length);
    expect(summary.skipped).toEqual([]);
    for (const record of repository.records.values()) {
      expect(parsePluginManifest(record.current?.manifest).ok).toBe(true);
    }
  });

  it('is idempotent: a second run creates nothing and changes nothing an admin did', async () => {
    const { seeder, repository, auditRepository } = build();
    await seeder.seed();
    const edited = repository.records.get('context7');
    if (edited !== undefined) {
      edited.globallyEnabled = true;
      edited.adminNotes = 'edited by an admin';
    }
    const writesAfterFirst = auditRepository.write.mock.calls.length;

    const second = await seeder.seed();

    expect(second.created).toEqual([]);
    expect(second.unchanged).toHaveLength(CURATED_SEEDS.length);
    expect(repository.records.get('context7')).toMatchObject({
      globallyEnabled: true,
      adminNotes: 'edited by an admin',
    });
    expect(auditRepository.write.mock.calls.length).toBe(writesAfterFirst);
  });

  it('seeds only disabled drafts that need verification, so nothing unverified reaches users', async () => {
    const { seeder, repository } = build();
    await seeder.seed();

    for (const record of repository.records.values()) {
      expect(record).toMatchObject({
        status: CatalogStatus.DRAFT,
        globallyEnabled: false,
        needsVerification: true,
      });
      expect(record.adminNotes).toMatch(/verify/i);
    }
  });

  it('never invents a URL: an entry has the repo-documented URL or the labelled placeholder', () => {
    const documented = ['https://mcp.context7.com/mcp', 'https://mcp.deepwiki.com/mcp'];

    for (const seed of CURATED_SEEDS) {
      expect([...documented, UNVERIFIED_SERVER_URL]).toContain(seed.url);
      expect(seed.urlConfirmed).toBe(documented.includes(seed.url));
    }
  });

  it('needs no secret from us: each entry is keyless or takes a key the user supplies', () => {
    const kinds = new Set(CURATED_SEEDS.map((seed) => seed.authKind));

    expect(kinds.has(AuthKind.OAUTH2_PKCE as never)).toBe(false);
    expect(
      [...kinds].every((kind) =>
        [AuthKind.NONE, AuthKind.API_KEY, AuthKind.BEARER_TOKEN].includes(kind),
      ),
    ).toBe(true);
  });

  it('writes one audit row per created entry, by the system actor', async () => {
    const { seeder, auditRepository } = build();

    await seeder.seed();

    expect(auditRepository.write).toHaveBeenCalledTimes(CURATED_SEEDS.length);
    expect(auditRepository.write.mock.calls[0]?.[0]).toMatchObject({
      actorId: 'system',
      action: 'CATALOG_SEEDED',
    });
  });

  it('soft-fails: a database error is logged, not thrown, at boot', async () => {
    const { seeder, repository } = build();
    repository.slugExists = () => Promise.reject(new Error('db down'));

    await expect(seeder.onModuleInit()).resolves.toBeUndefined();
  });
});
