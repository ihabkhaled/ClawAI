import { Logger } from '@nestjs/common';

import { type PluginManifestInput } from '../../../catalog/schemas/plugin-manifest.schema';
import { compareSemver } from '../../../catalog/utilities/compare-semver.utility';
import {
  type ExistingSeedEntry,
  type SeedEntryContent,
  type SeedVersionData,
} from '../../types/seeding.types';

const state = vi.hoisted(() => ({ manifests: [] as unknown[] }));

vi.mock('../../constants/first-party-manifests.constants', () => ({
  get FIRST_PARTY_MANIFESTS() {
    return state.manifests;
  },
}));

const { CatalogSeederService } = await import('../catalog-seeder.service');
const { WEATHER_MANIFEST } = await import('../../constants/manifests/weather.manifest');
const { WEB_FETCH_MANIFEST } = await import('../../constants/manifests/web-fetch.manifest');
const { DATETIME_AND_MATH_MANIFEST } =
  await import('../../constants/manifests/datetime-and-math.manifest');

type StoredEntry = ExistingSeedEntry & { versions: Map<string, { id: string; hash: string }> };

/** An in-memory stand-in for CatalogSeedRepository that records every write. */
class FakeSeedRepository {
  entries = new Map<string, StoredEntry>();
  writes: string[] = [];
  private counter = 0;

  findEntryBySlug = vi.fn(async (slug: string): Promise<ExistingSeedEntry | null> => {
    const stored = this.entries.get(slug);
    return stored === undefined ? null : { ...stored };
  });

  createEntryWithVersion = vi.fn(
    async (slug: string, content: SeedEntryContent, version: SeedVersionData) => {
      this.writes.push(`create:${slug}`);
      this.counter += 1;
      const versionId = `v${this.counter}`;
      this.entries.set(slug, {
        id: `e${this.counter}`,
        ...content,
        currentVersion: { id: versionId, version: version.version },
        versions: new Map([[version.version, { id: versionId, hash: version.manifestHash }]]),
      });
    },
  );

  updateEntryContent = vi.fn(async (entryId: string, content: SeedEntryContent) => {
    this.writes.push(`content:${entryId}`);
    for (const entry of this.entries.values()) {
      if (entry.id === entryId) Object.assign(entry, content);
    }
  });

  findVersion = vi.fn(async (entryId: string, version: string) => {
    for (const entry of this.entries.values()) {
      const stored = entry.id === entryId ? entry.versions.get(version) : undefined;
      if (stored !== undefined) return { id: stored.id, manifestHash: stored.hash };
    }
    return null;
  });

  addVersion = vi.fn(async (entryId: string, version: SeedVersionData, makeCurrent: boolean) => {
    this.writes.push(`add:${version.version}:${makeCurrent ? 'current' : 'kept'}`);
    this.counter += 1;
    for (const entry of this.entries.values()) {
      if (entry.id !== entryId) continue;
      entry.versions.set(version.version, { id: `v${this.counter}`, hash: version.manifestHash });
      if (makeCurrent) entry.currentVersion = { id: `v${this.counter}`, version: version.version };
    }
  });

  setCurrentVersion = vi.fn(async (entryId: string, versionId: string) => {
    this.writes.push(`current:${versionId}`);
    for (const entry of this.entries.values()) {
      if (entry.id !== entryId) continue;
      for (const [version, stored] of entry.versions) {
        if (stored.id === versionId) entry.currentVersion = { id: versionId, version };
      }
    }
  });
}

function clone(manifest: PluginManifestInput, mutate: (copy: Record<string, unknown>) => void) {
  const copy: Record<string, unknown> = structuredClone(manifest);
  mutate(copy);
  return copy;
}

function build(manifests: unknown[]) {
  state.manifests = manifests;
  const repository = new FakeSeedRepository();
  return { repository, service: new CatalogSeederService(repository as never) };
}

describe('CatalogSeederService', () => {
  const all = [WEB_FETCH_MANIFEST, DATETIME_AND_MATH_MANIFEST, WEATHER_MANIFEST];

  it('creates every first-party entry on an empty database', async () => {
    const { service, repository } = build(all);

    const summary = await service.seed();

    expect(summary).toEqual({
      created: ['web-fetch', 'datetime-and-math', 'weather'],
      updated: [],
      unchanged: [],
      skipped: [],
      versionBumpRequired: [],
    });
    expect(repository.createEntryWithVersion).toHaveBeenCalledTimes(3);
    const [slug, content, version] = repository.createEntryWithVersion.mock.calls[2] ?? [];
    expect(slug).toBe('weather');
    expect(content).toMatchObject({ category: 'data', iconKey: 'cloud', publisher: 'ClawAI' });
    expect(version).toMatchObject({
      version: '1.0.0',
      runtimeKind: 'BUILTIN',
      tools: [{ name: 'get_weather', riskLevel: 'READ', scopes: ['read'] }],
    });
    expect((version as SeedVersionData).manifestHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is idempotent: a second run changes nothing and writes nothing', async () => {
    const { service, repository } = build(all);
    await service.seed();
    repository.writes.length = 0;

    const summary = await service.seed();

    expect(summary).toEqual({
      created: [],
      updated: [],
      unchanged: ['web-fetch', 'datetime-and-math', 'weather'],
      skipped: [],
      versionBumpRequired: [],
    });
    expect(repository.writes).toEqual([]);
    expect(repository.entries.size).toBe(3);
  });

  it('survives many repeated boots without growing the catalog', async () => {
    const { service, repository } = build(all);
    for (let boot = 0; boot < 5; boot += 1) await service.seed();

    expect(repository.createEntryWithVersion).toHaveBeenCalledTimes(3);
    expect(repository.writes).toHaveLength(3);
  });

  it('updates descriptive content together with a version bump, and nothing admin-owned', async () => {
    const { service, repository } = build(all);
    await service.seed();
    repository.writes.length = 0;
    state.manifests = [
      WEB_FETCH_MANIFEST,
      DATETIME_AND_MATH_MANIFEST,
      clone(WEATHER_MANIFEST, (copy) => {
        (
          (copy['translations'] as Record<string, Record<string, string>>)['fr'] as Record<
            string,
            string
          >
        )['name'] = 'Météo locale';
        copy['publisher'] = 'ClawAI Labs';
        copy['version'] = '1.0.1';
      }),
    ];

    const summary = await service.seed();

    expect(summary.updated).toEqual(['weather']);
    expect(summary.unchanged).toEqual(['web-fetch', 'datetime-and-math']);
    expect(repository.updateEntryContent).toHaveBeenCalledTimes(1);
    const content = repository.updateEntryContent.mock.calls[0]?.[1] as SeedEntryContent;
    expect(Object.keys(content).sort()).toEqual(
      ['category', 'homepageUrl', 'iconKey', 'publisher', 'translations'].sort(),
    );
    // Status, globallyEnabled and featured are admin-owned and are never written.
    expect(content).not.toHaveProperty('status');
    expect(content).not.toHaveProperty('globallyEnabled');
    expect(content).not.toHaveProperty('featured');
    expect(repository.addVersion).toHaveBeenCalledWith('e3', expect.anything(), true);
  });

  it('never rewrites a published version: a changed manifest without a bump is reported and skipped', async () => {
    const { service, repository } = build([WEB_FETCH_MANIFEST]);
    await service.seed();
    repository.writes.length = 0;
    const warn = vi.spyOn(Logger.prototype, 'warn');
    state.manifests = [
      clone(WEB_FETCH_MANIFEST, (copy) => {
        ((copy['tools'] as Array<Record<string, unknown>>)[0] as Record<string, unknown>)[
          'timeoutMs'
        ] = 20_000;
        copy['publisher'] = 'Someone Else';
      }),
    ];

    const summary = await service.seed();

    expect(summary.versionBumpRequired).toEqual(['web-fetch']);
    expect(summary.updated).toEqual([]);
    expect(repository.writes).toEqual([]);
    expect(repository.addVersion).not.toHaveBeenCalled();
    expect(repository.updateEntryContent).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('VERSION_BUMP_REQUIRED'));
    warn.mockRestore();
  });

  it('adds a newer version and makes it current', async () => {
    const { service, repository } = build([WEATHER_MANIFEST]);
    await service.seed();
    state.manifests = [clone(WEATHER_MANIFEST, (copy) => (copy['version'] = '1.1.0'))];

    const summary = await service.seed();

    expect(summary.updated).toEqual(['weather']);
    expect(repository.addVersion).toHaveBeenCalledWith('e1', expect.anything(), true);
    expect(repository.entries.get('weather')?.currentVersion?.version).toBe('1.1.0');
  });

  it('adds an older version without moving the current pointer', async () => {
    const { service, repository } = build([
      clone(WEATHER_MANIFEST, (copy) => (copy['version'] = '2.0.0')),
    ]);
    await service.seed();
    state.manifests = [WEATHER_MANIFEST];

    await service.seed();

    expect(repository.addVersion).toHaveBeenCalledWith('e1', expect.anything(), false);
    const entry = repository.entries.get('weather');
    expect(entry?.currentVersion?.version).toBe('2.0.0');
    expect(compareSemver('2.0.0', '1.0.0')).toBeGreaterThan(0);
  });

  it('re-points the entry when an existing newer version is not current', async () => {
    const { service, repository } = build([WEATHER_MANIFEST]);
    await service.seed();
    const entry = repository.entries.get('weather');
    if (entry === undefined) throw new Error('entry missing');
    const stored = entry.versions.get('1.0.0');
    entry.currentVersion = { id: 'other', version: '0.9.0' };

    await service.seed();

    expect(repository.setCurrentVersion).toHaveBeenCalledWith(entry.id, stored?.id);
    expect(entry.currentVersion?.version).toBe('1.0.0');
  });

  it('skips and reports a manifest that fails the schema, and keeps going', async () => {
    const { service, repository } = build([
      clone(WEB_FETCH_MANIFEST, (copy) => (copy['slug'] = 'Bad Slug')),
      WEATHER_MANIFEST,
    ]);

    const summary = await service.seed();

    expect(summary.skipped).toEqual(['Bad Slug']);
    expect(summary.created).toEqual(['weather']);
    expect(repository.createEntryWithVersion).toHaveBeenCalledTimes(1);
  });

  it('skips a BUILTIN manifest whose adapter key is not registered', async () => {
    const { service, repository } = build([
      clone(
        WEATHER_MANIFEST,
        (copy) => (copy['runtime'] = { kind: 'BUILTIN', adapterKey: 'shell-exec' }),
      ),
    ]);

    const summary = await service.seed();

    expect(summary.skipped).toEqual(['weather']);
    expect(repository.createEntryWithVersion).not.toHaveBeenCalled();
  });

  it('accepts an MCP_REMOTE manifest without an adapter', async () => {
    const { service } = build([
      clone(WEATHER_MANIFEST, (copy) => {
        copy['runtime'] = {
          kind: 'MCP_REMOTE',
          server: { url: 'https://mcp.example.com/mcp', transport: 'streamable-http' },
        };
      }),
    ]);

    expect((await service.seed()).created).toEqual(['weather']);
  });

  describe('onModuleInit', () => {
    it('seeds on boot', async () => {
      const { service, repository } = build(all);

      await service.onModuleInit();

      expect(repository.createEntryWithVersion).toHaveBeenCalledTimes(3);
    });

    it('does not crash the service when the database is unavailable', async () => {
      const { service, repository } = build(all);
      repository.findEntryBySlug.mockRejectedValue(new Error('connection refused'));

      await expect(service.onModuleInit()).resolves.toBeUndefined();
    });
  });
});
