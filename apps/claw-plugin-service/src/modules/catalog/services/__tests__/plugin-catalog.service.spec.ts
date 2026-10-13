import { NotFoundException } from '@nestjs/common';
import { Locale } from '@claw/shared-types';

import { DATETIME_AND_MATH_MANIFEST } from '../../../seeding/constants/manifests/datetime-and-math.manifest';
import { WEATHER_MANIFEST } from '../../../seeding/constants/manifests/weather.manifest';
import { buildEntryRecord } from '../../__tests__/catalog-entry.fixture';
import { CatalogPresenterManager } from '../../managers/catalog-presenter.manager';
import { PluginCatalogService } from '../plugin-catalog.service';

const USER_ID = 'user-1';

function buildService(
  entries = [buildEntryRecord(), buildEntryRecord({}, WEATHER_MANIFEST)],
  installed = new Set<string>(),
) {
  const repository = {
    findVisibleEntries: vi.fn().mockResolvedValue(entries),
    findVisibleEntryBySlug: vi.fn().mockResolvedValue(entries[0] ?? null),
    findInstalledPluginIds: vi.fn().mockResolvedValue(installed),
  };
  const service = new PluginCatalogService(repository as never, new CatalogPresenterManager());
  return { service, repository };
}

const threeEntries = [
  buildEntryRecord(),
  buildEntryRecord({}, DATETIME_AND_MATH_MANIFEST),
  buildEntryRecord({}, WEATHER_MANIFEST),
];

describe('PluginCatalogService', () => {
  describe('list', () => {
    it('returns localized cards and passes the category filter to the repository', async () => {
      const { service, repository } = buildService();

      const page = await service.list(
        USER_ID,
        { limit: 20, category: 'data', locale: Locale.DE },
        undefined,
      );

      expect(repository.findVisibleEntries).toHaveBeenCalledWith('data');
      expect(page.items.map((item) => item.name)).toEqual(['Webseite abrufen', 'Wetter']);
      expect(page.nextCursor).toBeNull();
    });

    it('uses Accept-Language when no explicit locale is given', async () => {
      const { service } = buildService();

      const page = await service.list(USER_ID, { limit: 20 }, 'es-MX,es;q=0.9');

      expect(page.items[0]?.name).toBe('Lectura web');
    });

    it('falls back to English for an unsupported language', async () => {
      const { service } = buildService();

      const page = await service.list(USER_ID, { limit: 20 }, 'sv');

      expect(page.items[0]?.name).toBe('Web Fetch');
    });

    it('filters by search text across name, summary, slug and publisher, case-insensitively', async () => {
      const { service } = buildService();

      expect(
        (await service.list(USER_ID, { limit: 20, q: 'FORECAST' }, undefined)).items,
      ).toHaveLength(1);
      expect(
        (await service.list(USER_ID, { limit: 20, q: 'web-fetch' }, undefined)).items,
      ).toHaveLength(1);
      expect(
        (await service.list(USER_ID, { limit: 20, q: 'clawai' }, undefined)).items,
      ).toHaveLength(2);
      expect(
        (await service.list(USER_ID, { limit: 20, q: 'zzz-no-match' }, undefined)).items,
      ).toEqual([]);
      expect((await service.list(USER_ID, { limit: 20, q: '' }, undefined)).items).toHaveLength(2);
    });

    it('paginates with a slug cursor', async () => {
      const { service } = buildService(threeEntries);

      const first = await service.list(USER_ID, { limit: 2 }, undefined);
      expect(first.items.map((item) => item.slug)).toEqual(['web-fetch', 'datetime-and-math']);
      expect(first.nextCursor).toBe('datetime-and-math');

      const second = await service.list(
        USER_ID,
        { limit: 2, cursor: first.nextCursor ?? undefined },
        undefined,
      );
      expect(second.items.map((item) => item.slug)).toEqual(['weather']);
      expect(second.nextCursor).toBeNull();
    });

    it('gives an empty last page when the page ends exactly at the end', async () => {
      const { service } = buildService(threeEntries);

      const page = await service.list(USER_ID, { limit: 3 }, undefined);

      expect(page.items).toHaveLength(3);
      expect(page.nextCursor).toBeNull();
    });

    it('returns an empty page for a cursor that no longer exists', async () => {
      const { service } = buildService(threeEntries);

      const page = await service.list(USER_ID, { limit: 2, cursor: 'removed-plugin' }, undefined);

      expect(page).toEqual({ items: [], nextCursor: null });
    });

    it('drops entries whose stored data is corrupt instead of failing the page', async () => {
      const { service } = buildService([
        buildEntryRecord({ translations: 'broken' }),
        buildEntryRecord({}, WEATHER_MANIFEST),
      ]);

      const page = await service.list(USER_ID, { limit: 20 }, undefined);

      expect(page.items.map((item) => item.slug)).toEqual(['weather']);
    });

    it('returns an empty catalog as an empty page', async () => {
      const { service } = buildService([]);

      expect(await service.list(USER_ID, { limit: 20 }, undefined)).toEqual({
        items: [],
        nextCursor: null,
      });
    });
  });

  describe('detail', () => {
    it('returns the localized detail', async () => {
      const { service, repository } = buildService();

      const detail = await service.detail(USER_ID, 'web-fetch', { locale: Locale.IT }, undefined);

      expect(repository.findVisibleEntryBySlug).toHaveBeenCalledWith('web-fetch');
      expect(detail.name).toBe('Lettura web');
      expect(detail.tools.map((tool) => tool.name)).toEqual(['fetch_page']);
    });

    it('throws 404 PLUGIN_NOT_FOUND for an unknown, unpublished or disabled slug', async () => {
      const { service, repository } = buildService();
      repository.findVisibleEntryBySlug.mockResolvedValue(null);

      const failure = await service
        .detail(USER_ID, 'nope', {}, undefined)
        .catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(NotFoundException);
      expect((failure as NotFoundException).getResponse()).toMatchObject({
        errorCode: 'PLUGIN_NOT_FOUND',
      });
    });

    it('throws 404 when the stored entry is corrupt', async () => {
      const { service, repository } = buildService();
      repository.findVisibleEntryBySlug.mockResolvedValue(buildEntryRecord({ translations: 7 }));

      await expect(service.detail(USER_ID, 'web-fetch', {}, undefined)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});

describe('PluginCatalogService installed flag', () => {
  it('marks only the entries the caller installed on the list', async () => {
    const { service, repository } = buildService(undefined, new Set(['entry-weather']));

    const page = await service.list(USER_ID, { limit: 20 }, undefined);

    expect(repository.findInstalledPluginIds).toHaveBeenCalledWith(USER_ID);
    expect(page.items.map((item) => [item.slug, item.installed])).toEqual([
      ['web-fetch', false],
      ['weather', true],
    ]);
  });

  it('marks the detail installed for the caller, scoped to that one entry', async () => {
    const { service, repository } = buildService(undefined, new Set(['entry-web-fetch']));

    const detail = await service.detail(USER_ID, 'web-fetch', {}, undefined);

    expect(repository.findInstalledPluginIds).toHaveBeenCalledWith(USER_ID, ['entry-web-fetch']);
    expect(detail.installed).toBe(true);
  });

  it('does not look up installs for a slug that does not exist', async () => {
    const { service, repository } = buildService();
    repository.findVisibleEntryBySlug.mockResolvedValue(null);

    await expect(service.detail(USER_ID, 'nope', {}, undefined)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.findInstalledPluginIds).not.toHaveBeenCalled();
  });
});
