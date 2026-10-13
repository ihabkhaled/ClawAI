import { Logger, NotFoundException } from '@nestjs/common';

import { CatalogSource } from '../../../../common/enums/catalog-source.enum';
import { CatalogStatus } from '../../../../common/enums/catalog-status.enum';
import { RiskLevel } from '../../../../common/enums/risk-level.enum';
import { WEATHER_MANIFEST } from '../../../seeding/constants/manifests/weather.manifest';
import { AdminCatalogPresenterManager } from '../../managers/admin-catalog-presenter.manager';
import { type AdminCatalogRecord } from '../../types/admin.types';
import { AdminCatalogService } from '../admin-catalog.service';

function record(overrides: Partial<AdminCatalogRecord> = {}): AdminCatalogRecord {
  return {
    id: 'entry-weather',
    slug: 'weather',
    source: CatalogSource.FIRST_PARTY,
    status: CatalogStatus.PUBLISHED,
    category: 'data',
    publisher: 'ClawAI',
    iconKey: 'cloud',
    translations: WEATHER_MANIFEST.translations,
    globallyEnabled: true,
    featured: false,
    installCount: 7,
    currentVersion: {
      id: 'version-weather',
      version: '1.0.0',
      tools: [{ name: 'get_weather', riskLevel: RiskLevel.READ, disabledByAdmin: false }],
    },
    ...overrides,
  };
}

function buildService(found: AdminCatalogRecord | null = record()) {
  const repository = {
    findAll: vi.fn().mockResolvedValue([record()]),
    findBySlug: vi.fn().mockResolvedValue(found),
    applyChanges: vi.fn().mockResolvedValue(undefined),
  };
  return {
    repository,
    service: new AdminCatalogService(repository as never, new AdminCatalogPresenterManager()),
  };
}

describe('AdminCatalogService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists every entry as an admin row', async () => {
    const { service } = buildService();

    await expect(service.list()).resolves.toEqual([
      {
        slug: 'weather',
        name: 'Weather',
        publisher: 'ClawAI',
        category: 'data',
        iconKey: 'cloud',
        source: 'FIRST_PARTY',
        status: 'PUBLISHED',
        version: '1.0.0',
        globallyEnabled: true,
        featured: false,
        installCount: 7,
        tools: [{ name: 'get_weather', riskLevel: 'READ', disabledByAdmin: false }],
      },
    ]);
  });

  it('shows an entry with no current version and no tools', async () => {
    const { service } = buildService(record({ currentVersion: null, translations: { bad: 1 } }));

    await expect(service.get('weather')).resolves.toMatchObject({
      name: 'weather',
      version: null,
      tools: [],
    });
  });

  it('answers 404 PLUGIN_NOT_FOUND for an unknown slug', async () => {
    const { service } = buildService(null);

    const failure = await service.get('nope').catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(NotFoundException);
    expect((failure as NotFoundException).getResponse()).toMatchObject({
      errorCode: 'PLUGIN_NOT_FOUND',
    });
  });

  describe('update', () => {
    it('flips the kill switch and the featured flag', async () => {
      const { service, repository } = buildService();

      await service.update('admin-1', 'weather', { globallyEnabled: false, featured: true });

      expect(repository.applyChanges).toHaveBeenCalledWith(
        'entry-weather',
        'version-weather',
        { globallyEnabled: false, featured: true },
        [],
      );
    });

    it('sends only the switches that were given', async () => {
      const { service, repository } = buildService();

      await service.update('admin-1', 'weather', { featured: true });
      await service.update('admin-1', 'weather', { globallyEnabled: true });

      expect(repository.applyChanges.mock.calls[0]?.[2]).toEqual({ featured: true });
      expect(repository.applyChanges.mock.calls[1]?.[2]).toEqual({ globallyEnabled: true });
    });

    it('disables a tool of the current version', async () => {
      const { service, repository } = buildService();

      await service.update('admin-1', 'weather', {
        tools: [{ name: 'get_weather', disabledByAdmin: true }],
      });

      expect(repository.applyChanges).toHaveBeenCalledWith('entry-weather', 'version-weather', {}, [
        { name: 'get_weather', disabledByAdmin: true },
      ]);
    });

    it('answers 404 PLUGIN_TOOL_NOT_FOUND for a tool the plugin does not have and changes nothing', async () => {
      const { service, repository } = buildService();

      const failure = await service
        .update('admin-1', 'weather', {
          featured: true,
          tools: [{ name: 'ghost', disabledByAdmin: true }],
        })
        .catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(NotFoundException);
      expect((failure as NotFoundException).getResponse()).toMatchObject({
        errorCode: 'PLUGIN_TOOL_NOT_FOUND',
      });
      expect(repository.applyChanges).not.toHaveBeenCalled();
    });

    it('refuses tool changes on an entry without a current version', async () => {
      const { service, repository } = buildService(record({ currentVersion: null }));

      await expect(
        service.update('admin-1', 'weather', {
          tools: [{ name: 'get_weather', disabledByAdmin: true }],
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.applyChanges).not.toHaveBeenCalled();
    });

    it('still flips the kill switch on an entry without a current version', async () => {
      const { service, repository } = buildService(record({ currentVersion: null }));

      await service.update('admin-1', 'weather', { globallyEnabled: false });

      expect(repository.applyChanges).toHaveBeenCalledWith(
        'entry-weather',
        null,
        { globallyEnabled: false },
        [],
      );
    });

    it('answers 404 for an unknown slug and changes nothing', async () => {
      const { service, repository } = buildService(null);

      await expect(service.update('admin-1', 'nope', { featured: true })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.applyChanges).not.toHaveBeenCalled();
    });

    it('writes an audit line with the admin, the plugin and what changed', async () => {
      const lines: string[] = [];
      vi.spyOn(Logger.prototype, 'log').mockImplementation((message: unknown) => {
        lines.push(String(message));
      });
      const { service } = buildService();

      await service.update('admin-1', 'weather', { globallyEnabled: false });

      expect(lines[0] ?? '').toContain('admin=admin-1');
      expect(lines[0] ?? '').toContain('plugin=weather');
      expect(lines[0] ?? '').toContain('globallyEnabled=false');
    });
  });
});
