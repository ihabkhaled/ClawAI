import { Locale } from '@claw/shared-types';

import { AuthKind } from '../../../../common/enums/auth-kind.enum';
import { CatalogStatus } from '../../../../common/enums/catalog-status.enum';
import { InstallState } from '../../../../common/enums/install-state.enum';
import { InstallStatus } from '../../../../common/enums/install-status.enum';
import { RiskLevel } from '../../../../common/enums/risk-level.enum';
import {
  buildInstallRecord,
  INSTALL_ID,
  KEYED_MANIFEST,
} from '../../__tests__/install-record.fixture';
import { InstallPresenterManager } from '../install-presenter.manager';

const presenter = new InstallPresenterManager();

function withPlugin(overrides: Record<string, unknown>) {
  const base = buildInstallRecord();
  return buildInstallRecord({ plugin: { ...base.plugin, ...overrides } });
}

describe('InstallPresenterManager', () => {
  describe('stateOf', () => {
    it('is ENABLED or DISABLED for an available plugin', () => {
      expect(presenter.stateOf(buildInstallRecord())).toBe(InstallState.ENABLED);
      expect(presenter.stateOf(buildInstallRecord({ status: InstallStatus.DISABLED }))).toBe(
        InstallState.DISABLED,
      );
    });

    it('is UNAVAILABLE when the plugin is globally disabled, whatever the user chose', () => {
      expect(presenter.stateOf(withPlugin({ globallyEnabled: false }))).toBe(
        InstallState.UNAVAILABLE,
      );
      expect(
        presenter.stateOf(
          buildInstallRecord({
            status: InstallStatus.DISABLED,
            plugin: { ...buildInstallRecord().plugin, globallyEnabled: false },
          }),
        ),
      ).toBe(InstallState.UNAVAILABLE);
    });

    it('is UNAVAILABLE when the plugin is no longer published', () => {
      expect(presenter.stateOf(withPlugin({ status: CatalogStatus.HIDDEN }))).toBe(
        InstallState.UNAVAILABLE,
      );
      expect(presenter.stateOf(withPlugin({ status: CatalogStatus.DEPRECATED }))).toBe(
        InstallState.UNAVAILABLE,
      );
    });
  });

  describe('toView', () => {
    it('localizes the name and reports version, state and auth kind', () => {
      const view = presenter.toView(buildInstallRecord(), Locale.DE);

      expect(view).toMatchObject({
        id: INSTALL_ID,
        slug: 'weather',
        name: 'Wetter',
        iconKey: 'cloud',
        version: '1.0.0',
        latestVersion: '1.0.0',
        state: 'ENABLED',
        authKind: 'NONE',
        settings: { units: 'metric' },
        installedAt: '2026-10-13T10:00:00.000Z',
        updatedAt: '2026-10-13T11:00:00.000Z',
      });
    });

    it('reports a pinned older version next to the latest one', () => {
      const record = buildInstallRecord();
      record.plugin.latestVersion = '1.2.0';

      const view = presenter.toView(record, Locale.EN);

      expect(view.version).toBe('1.0.0');
      expect(view.latestVersion).toBe('1.2.0');
    });

    it('reports credential presence without any secret material', () => {
      const none = presenter.toView(buildInstallRecord(), Locale.EN);
      const some = presenter.toView(
        buildInstallRecord(
          {
            credential: { kind: AuthKind.API_KEY, updatedAt: new Date('2026-10-13T09:00:00.000Z') },
          },
          KEYED_MANIFEST,
        ),
        Locale.EN,
      );

      expect(none.credential).toEqual({ hasCredential: false, kind: null, updatedAt: null });
      expect(some.credential).toEqual({
        hasCredential: true,
        kind: 'API_KEY',
        updatedAt: '2026-10-13T09:00:00.000Z',
      });
      expect(some.authKind).toBe('API_KEY');
      expect(Object.keys(some.credential).sort()).toEqual(['hasCredential', 'kind', 'updatedAt']);
    });

    it('lists the stored consents', () => {
      const view = presenter.toView(
        buildInstallRecord({
          consents: [
            {
              toolName: 'write_note',
              level: RiskLevel.WRITE,
              grantedAt: new Date('2026-10-13T08:00:00.000Z'),
            },
          ],
        }),
        Locale.EN,
      );

      expect(view.consents).toEqual([
        { toolName: 'write_note', level: 'WRITE', grantedAt: '2026-10-13T08:00:00.000Z' },
      ]);
    });

    it('falls back to the slug when the stored translations are corrupt', () => {
      const view = presenter.toView(withPlugin({ translations: { nope: true } }), Locale.EN);

      expect(view.name).toBe('weather');
    });

    it('falls back to NONE auth and empty settings when stored data is corrupt', () => {
      const record = buildInstallRecord({ settings: ['not', 'an', 'object'] });
      record.version.manifest = { broken: true };

      const view = presenter.toView(record, Locale.EN);

      expect(view.authKind).toBe('NONE');
      expect(view.settings).toEqual({});
    });
  });

  describe('toMention', () => {
    it('carries only what the picker needs', () => {
      const mention = presenter.toMention(buildInstallRecord(), Locale.FR);

      expect(mention).toEqual({
        installId: INSTALL_ID,
        slug: 'weather',
        name: 'Météo',
        iconKey: 'cloud',
        enabled: true,
      });
    });

    it('is not enabled for a disabled or unavailable install', () => {
      expect(
        presenter.toMention(buildInstallRecord({ status: InstallStatus.DISABLED }), Locale.EN)
          .enabled,
      ).toBe(false);
      expect(presenter.toMention(withPlugin({ globallyEnabled: false }), Locale.EN).enabled).toBe(
        false,
      );
    });
  });
});
