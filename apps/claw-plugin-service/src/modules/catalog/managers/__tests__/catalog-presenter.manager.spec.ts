import { Locale } from '@claw/shared-types';

import { RiskLevel } from '../../../../common/enums/risk-level.enum';
import { WEATHER_MANIFEST } from '../../../seeding/constants/manifests/weather.manifest';
import { buildEntryRecord } from '../../__tests__/catalog-entry.fixture';
import { CatalogPresenterManager } from '../catalog-presenter.manager';

describe('CatalogPresenterManager', () => {
  const presenter = new CatalogPresenterManager();

  describe('toCard', () => {
    it('localizes the text and summarises the tools', () => {
      const card = presenter.toCard(buildEntryRecord({}, WEATHER_MANIFEST), Locale.FR);

      expect(card).toMatchObject({
        slug: 'weather',
        name: 'Météo',
        publisher: 'ClawAI',
        category: 'data',
        iconKey: 'cloud',
        source: 'FIRST_PARTY',
        version: '1.0.0',
        toolCount: 1,
        maxRisk: RiskLevel.READ,
        installCount: 0,
        installed: false,
      });
    });

    it('falls back to English for a locale the entry does not translate', () => {
      const entry = buildEntryRecord();
      const english = (entry.translations as { en: { name: string } }).en;
      entry.translations = { en: english };

      expect(presenter.toCard(entry, Locale.JA)?.name).toBe(english.name);
    });

    it('leaves admin-disabled tools out of the count and the risk', () => {
      const entry = buildEntryRecord();
      entry.currentVersion.tools = [
        { name: 'read_it', riskLevel: RiskLevel.READ, disabledByAdmin: false },
        { name: 'drop_it', riskLevel: RiskLevel.DESTRUCTIVE, disabledByAdmin: true },
      ];

      const card = presenter.toCard(entry, Locale.EN);

      expect(card?.toolCount).toBe(1);
      expect(card?.maxRisk).toBe(RiskLevel.READ);
    });

    it('reports the highest risk among enabled tools', () => {
      const entry = buildEntryRecord();
      entry.currentVersion.tools = [
        { name: 'a', riskLevel: RiskLevel.READ, disabledByAdmin: false },
        { name: 'b', riskLevel: RiskLevel.DESTRUCTIVE, disabledByAdmin: false },
        { name: 'c', riskLevel: RiskLevel.WRITE, disabledByAdmin: false },
      ];

      expect(presenter.toCard(entry, Locale.EN)?.maxRisk).toBe(RiskLevel.DESTRUCTIVE);
    });

    it('reports READ with zero tools', () => {
      const entry = buildEntryRecord();
      entry.currentVersion.tools = [];

      const card = presenter.toCard(entry, Locale.EN);

      expect(card?.toolCount).toBe(0);
      expect(card?.maxRisk).toBe(RiskLevel.READ);
    });

    it('skips an entry whose stored translations are corrupt', () => {
      const entry = buildEntryRecord({ translations: { fr: { name: 'x' } } });

      expect(presenter.toCard(entry, Locale.EN)).toBeNull();
    });
  });

  describe('toDetail', () => {
    it('returns the full detail with tools, auth, network and sorted versions', () => {
      const entry = buildEntryRecord({ versions: ['1.0.0', '1.10.0', '1.2.0'] }, WEATHER_MANIFEST);

      const detail = presenter.toDetail(entry, Locale.EN);

      expect(detail).toMatchObject({
        slug: 'weather',
        description: expect.stringContaining('Open-Meteo'),
        homepageUrl: 'https://open-meteo.com',
        auth: { kind: 'NONE', scopes: [{ id: 'read', description: expect.any(String) }] },
        network: {
          hosts: ['api.open-meteo.com', 'geocoding-api.open-meteo.com'],
          publicWeb: false,
        },
        versions: ['1.10.0', '1.2.0', '1.0.0'],
      });
      expect(detail?.tools).toEqual([
        expect.objectContaining({
          name: 'get_weather',
          title: 'Get the weather',
          riskLevel: 'READ',
          scopes: ['read'],
          inputSchema: expect.objectContaining({ type: 'object' }),
        }),
      ]);
      expect(detail?.settingsSchema).toMatchObject({ type: 'object' });
    });

    it('hides tools an admin disabled', () => {
      const entry = buildEntryRecord({}, WEATHER_MANIFEST);
      entry.currentVersion.tools = [
        { name: 'get_weather', riskLevel: RiskLevel.READ, disabledByAdmin: true },
      ];

      const detail = presenter.toDetail(entry, Locale.EN);

      expect(detail?.tools).toEqual([]);
      expect(detail?.toolCount).toBe(0);
    });

    it('localizes the description', () => {
      const detail = presenter.toDetail(buildEntryRecord({}, WEATHER_MANIFEST), Locale.DE);

      expect(detail?.name).toBe('Wetter');
      expect(detail?.description).toContain('Open-Meteo');
      expect(detail?.description).toContain('Ortsnamen');
    });

    it('returns null when the stored manifest is corrupt', () => {
      const entry = buildEntryRecord();
      entry.currentVersion.manifest = { slug: 'web-fetch' };

      expect(presenter.toDetail(entry, Locale.EN)).toBeNull();
    });

    it('returns null when the stored translations are corrupt', () => {
      expect(presenter.toDetail(buildEntryRecord({ translations: null }), Locale.EN)).toBeNull();
    });
  });
});
