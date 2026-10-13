import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { CatalogStatus } from '../../../../common/enums/catalog-status.enum';
import { InstallStatus } from '../../../../common/enums/install-status.enum';
import { WEATHER_MANIFEST } from '../../../seeding/constants/manifests/weather.manifest';
import { InstallPresenterManager } from '../../managers/install-presenter.manager';
import { InstallSettingsManager } from '../../managers/install-settings.manager';
import {
  buildInstallEntry,
  buildInstallRecord,
  INSTALL_ID,
  OWNER_ID,
} from '../../__tests__/install-record.fixture';
import { PluginInstallsService } from '../plugin-installs.service';

function buildService(cap: number | null = 5) {
  const repository = {
    findEntryForInstall: vi.fn().mockResolvedValue(buildInstallEntry()),
    createWithinCap: vi.fn().mockResolvedValue({ kind: 'CREATED', installId: INSTALL_ID }),
    findOwned: vi.fn().mockResolvedValue(buildInstallRecord()),
    findAllOwned: vi.fn().mockResolvedValue([buildInstallRecord()]),
    update: vi.fn().mockResolvedValue(buildInstallRecord()),
    remove: vi.fn().mockResolvedValue(true),
  };
  const planGate = { resolveInstallCap: vi.fn().mockResolvedValue(cap) };
  const service = new PluginInstallsService(
    repository as never,
    planGate as never,
    new InstallSettingsManager(),
    new InstallPresenterManager(),
  );
  return { service, repository, planGate };
}

async function failureOf(work: Promise<unknown>): Promise<unknown> {
  return work.catch((error: unknown) => error);
}

describe('PluginInstallsService', () => {
  describe('install', () => {
    it('pins the current version, fills setting defaults and returns the view', async () => {
      const { service, repository, planGate } = buildService(5);

      const view = await service.install(OWNER_ID, { slug: 'weather' }, 'fr');

      expect(planGate.resolveInstallCap).toHaveBeenCalledWith(OWNER_ID);
      expect(repository.createWithinCap).toHaveBeenCalledWith(
        {
          userId: OWNER_ID,
          pluginId: 'entry-weather',
          versionId: 'version-weather',
          settings: { units: 'metric' },
        },
        5,
      );
      expect(view).toMatchObject({
        id: INSTALL_ID,
        slug: 'weather',
        name: 'Météo',
        state: 'ENABLED',
        version: '1.0.0',
      });
    });

    it('hands a null cap (unlimited) to the repository unchanged', async () => {
      const { service, repository } = buildService(null);

      await service.install(OWNER_ID, { slug: 'weather' }, undefined);

      expect(repository.createWithinCap.mock.calls[0]?.[1]).toBeNull();
    });

    it('pins a requested older version instead of the current one', async () => {
      const { service, repository } = buildService();
      repository.findEntryForInstall.mockResolvedValue(
        buildInstallEntry({
          versions: [
            { id: 'version-new', version: '1.1.0', manifest: WEATHER_MANIFEST },
            { id: 'version-old', version: '1.0.0', manifest: WEATHER_MANIFEST },
          ],
          currentVersionId: 'version-new',
        }),
      );

      await service.install(OWNER_ID, { slug: 'weather', version: '1.0.0' }, undefined);

      expect(repository.createWithinCap.mock.calls[0]?.[0].versionId).toBe('version-old');
    });

    it('answers 404 PLUGIN_VERSION_NOT_FOUND for a version that does not exist', async () => {
      const { service, repository } = buildService();

      const failure = await failureOf(
        service.install(OWNER_ID, { slug: 'weather', version: '9.9.9' }, undefined),
      );

      expect(failure).toBeInstanceOf(NotFoundException);
      expect((failure as NotFoundException).getResponse()).toMatchObject({
        errorCode: 'PLUGIN_VERSION_NOT_FOUND',
      });
      expect(repository.createWithinCap).not.toHaveBeenCalled();
    });

    it('answers 404 PLUGIN_NOT_FOUND for an unknown slug', async () => {
      const { service, repository } = buildService();
      repository.findEntryForInstall.mockResolvedValue(null);

      const failure = await failureOf(service.install(OWNER_ID, { slug: 'nope' }, undefined));

      expect(failure).toBeInstanceOf(NotFoundException);
      expect((failure as NotFoundException).getResponse()).toMatchObject({
        errorCode: 'PLUGIN_NOT_FOUND',
      });
    });

    it.each([
      ['globally disabled', { globallyEnabled: false }],
      ['unpublished', { status: CatalogStatus.DRAFT }],
      ['deprecated', { status: CatalogStatus.DEPRECATED }],
      ['without a current version', { currentVersionId: null }],
    ])('answers 409 PLUGIN_UNAVAILABLE for a plugin that is %s', async (_label, overrides) => {
      const { service, repository, planGate } = buildService();
      repository.findEntryForInstall.mockResolvedValue(buildInstallEntry(overrides));

      const failure = await failureOf(service.install(OWNER_ID, { slug: 'weather' }, undefined));

      expect(failure).toBeInstanceOf(ConflictException);
      expect((failure as ConflictException).getResponse()).toMatchObject({
        errorCode: 'PLUGIN_UNAVAILABLE',
      });
      expect(planGate.resolveInstallCap).not.toHaveBeenCalled();
      expect(repository.createWithinCap).not.toHaveBeenCalled();
    });

    it('answers 409 PLUGIN_UNAVAILABLE when the stored manifest is corrupt', async () => {
      const { service, repository } = buildService();
      repository.findEntryForInstall.mockResolvedValue(
        buildInstallEntry({
          versions: [{ id: 'version-weather', version: '1.0.0', manifest: { broken: true } }],
        }),
      );

      const failure = await failureOf(service.install(OWNER_ID, { slug: 'weather' }, undefined));

      expect(failure).toBeInstanceOf(ConflictException);
    });

    it('answers 400 PLUGIN_SETTINGS_INVALID before touching the plan or the database', async () => {
      const { service, repository, planGate } = buildService();

      const failure = await failureOf(
        service.install(OWNER_ID, { slug: 'weather', settings: { units: 'kelvin' } }, undefined),
      );

      expect(failure).toBeInstanceOf(BadRequestException);
      expect((failure as BadRequestException).getResponse()).toMatchObject({
        errorCode: 'PLUGIN_SETTINGS_INVALID',
        errors: [{ field: 'units', message: 'value not allowed' }],
      });
      expect(planGate.resolveInstallCap).not.toHaveBeenCalled();
      expect(repository.createWithinCap).not.toHaveBeenCalled();
    });

    it('answers 403 PLUGIN_INSTALL_LIMIT with the limit and the current count', async () => {
      const { service, repository } = buildService(5);
      repository.createWithinCap.mockResolvedValue({ kind: 'LIMIT', current: 5 });

      const failure = await failureOf(service.install(OWNER_ID, { slug: 'weather' }, undefined));

      expect(failure).toBeInstanceOf(ForbiddenException);
      expect((failure as ForbiddenException).getResponse()).toMatchObject({
        errorCode: 'PLUGIN_INSTALL_LIMIT',
        limit: 5,
        current: 5,
      });
    });

    it('treats a cap of 0 (installs disabled) as a limit of 0, not as unlimited', async () => {
      const { service, repository } = buildService(0);
      repository.createWithinCap.mockResolvedValue({ kind: 'LIMIT', current: 0 });

      const failure = await failureOf(service.install(OWNER_ID, { slug: 'weather' }, undefined));

      expect(repository.createWithinCap.mock.calls[0]?.[1]).toBe(0);
      expect((failure as ForbiddenException).getResponse()).toMatchObject({
        errorCode: 'PLUGIN_INSTALL_LIMIT',
        limit: 0,
        current: 0,
      });
    });

    it('answers 409 PLUGIN_ALREADY_INSTALLED for a duplicate', async () => {
      const { service, repository } = buildService();
      repository.createWithinCap.mockResolvedValue({ kind: 'DUPLICATE' });

      const failure = await failureOf(service.install(OWNER_ID, { slug: 'weather' }, undefined));

      expect(failure).toBeInstanceOf(ConflictException);
      expect((failure as ConflictException).getResponse()).toMatchObject({
        errorCode: 'PLUGIN_ALREADY_INSTALLED',
      });
    });

    it('lets a plan-gate refusal through and creates nothing', async () => {
      const { service, repository, planGate } = buildService();
      planGate.resolveInstallCap.mockRejectedValue(new ServiceUnavailableException());

      await expect(
        service.install(OWNER_ID, { slug: 'weather' }, undefined),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(repository.createWithinCap).not.toHaveBeenCalled();
    });
  });

  describe('reads are owner-scoped', () => {
    it('lists only through the owner query and localizes names', async () => {
      const { service, repository } = buildService();

      const views = await service.list(OWNER_ID, 'de');

      expect(repository.findAllOwned).toHaveBeenCalledWith(OWNER_ID);
      expect(views.map((view) => view.name)).toEqual(['Wetter']);
    });

    it('builds the mentions list with the enabled flag', async () => {
      const { service, repository } = buildService();
      repository.findAllOwned.mockResolvedValue([
        buildInstallRecord(),
        buildInstallRecord({ id: 'other', status: InstallStatus.DISABLED }),
      ]);

      const mentions = await service.mentions(OWNER_ID, undefined);

      expect(mentions.map((mention) => mention.enabled)).toEqual([true, false]);
    });

    it('gets an install through the owner query', async () => {
      const { service, repository } = buildService();

      await service.get(OWNER_ID, INSTALL_ID, undefined);

      expect(repository.findOwned).toHaveBeenCalledWith(INSTALL_ID, OWNER_ID);
    });

    it("answers 404 for another user's install id on get, update and remove", async () => {
      const { service, repository } = buildService();
      repository.findOwned.mockResolvedValue(null);
      repository.update.mockResolvedValue(null);
      repository.remove.mockResolvedValue(false);

      for (const work of [
        service.get('intruder', INSTALL_ID, undefined),
        service.update('intruder', INSTALL_ID, { enabled: false }, undefined),
        service.remove('intruder', INSTALL_ID),
        service.requireOwned(INSTALL_ID, 'intruder'),
      ]) {
        const failure = await failureOf(work);
        expect(failure).toBeInstanceOf(NotFoundException);
        expect((failure as NotFoundException).getResponse()).toMatchObject({
          errorCode: 'PLUGIN_INSTALL_NOT_FOUND',
        });
      }
      expect(repository.findOwned).toHaveBeenCalledWith(INSTALL_ID, 'intruder');
      expect(repository.remove).toHaveBeenCalledWith(INSTALL_ID, 'intruder');
    });
  });

  describe('update', () => {
    it('disables and enables an install', async () => {
      const { service, repository } = buildService();

      await service.update(OWNER_ID, INSTALL_ID, { enabled: false }, undefined);
      await service.update(OWNER_ID, INSTALL_ID, { enabled: true }, undefined);

      expect(repository.update).toHaveBeenNthCalledWith(1, INSTALL_ID, OWNER_ID, {
        status: InstallStatus.DISABLED,
      });
      expect(repository.update).toHaveBeenNthCalledWith(2, INSTALL_ID, OWNER_ID, {
        status: InstallStatus.ENABLED,
      });
    });

    it('validates new settings against the manifest and stores them', async () => {
      const { service, repository } = buildService();

      await service.update(OWNER_ID, INSTALL_ID, { settings: { units: 'imperial' } }, undefined);

      expect(repository.update).toHaveBeenCalledWith(INSTALL_ID, OWNER_ID, {
        settings: { units: 'imperial' },
      });
    });

    it('rejects invalid settings with 400 and writes nothing', async () => {
      const { service, repository } = buildService();

      await expect(
        service.update(OWNER_ID, INSTALL_ID, { settings: { extra: true } }, undefined),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('refuses to enable a plugin that was switched off for everyone', async () => {
      const { service, repository } = buildService();
      repository.findOwned.mockResolvedValue(
        buildInstallRecord({
          status: InstallStatus.DISABLED,
          plugin: { ...buildInstallRecord().plugin, globallyEnabled: false },
        }),
      );

      await expect(
        service.update(OWNER_ID, INSTALL_ID, { enabled: true }, undefined),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('still lets the user disable an unavailable plugin', async () => {
      const { service, repository } = buildService();
      repository.findOwned.mockResolvedValue(
        buildInstallRecord({ plugin: { ...buildInstallRecord().plugin, globallyEnabled: false } }),
      );

      await service.update(OWNER_ID, INSTALL_ID, { enabled: false }, undefined);

      expect(repository.update).toHaveBeenCalled();
    });

    it('answers 404 if the install vanished between the read and the write', async () => {
      const { service, repository } = buildService();
      repository.update.mockResolvedValue(null);

      await expect(
        service.update(OWNER_ID, INSTALL_ID, { enabled: false }, undefined),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('removes through the owner-scoped repository call', async () => {
      const { service, repository } = buildService();

      await expect(service.remove(OWNER_ID, INSTALL_ID)).resolves.toBeUndefined();
      expect(repository.remove).toHaveBeenCalledWith(INSTALL_ID, OWNER_ID);
    });
  });
});
