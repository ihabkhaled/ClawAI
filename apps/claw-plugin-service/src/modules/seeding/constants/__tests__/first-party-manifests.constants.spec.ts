import { Locale } from '@claw/shared-types';

import { RiskLevel } from '../../../../common/enums/risk-level.enum';
import { RuntimeKind } from '../../../../common/enums/runtime-kind.enum';
import { NATIVE_TOOL_NAME_MAX } from '../../../catalog/constants/catalog.constants';
import { parsePluginManifest } from '../../../catalog/utilities/parse-plugin-manifest.utility';
import { isRegisteredAdapterKey } from '../../../runtime/utilities/is-registered-adapter.utility';
import { FIRST_PARTY_MANIFESTS } from '../first-party-manifests.constants';

describe('first-party manifests', () => {
  const locales = Object.values(Locale);

  it('ships exactly web-fetch, datetime-and-math and weather', () => {
    expect(FIRST_PARTY_MANIFESTS.map((manifest) => manifest.slug).sort()).toEqual([
      'datetime-and-math',
      'weather',
      'web-fetch',
    ]);
  });

  it('has 13 locales and every one of them is a supported Locale', () => {
    expect(locales).toHaveLength(13);
  });

  describe.each(FIRST_PARTY_MANIFESTS.map((manifest) => [manifest.slug, manifest] as const))(
    '%s',
    (_slug, input) => {
      const parsed = parsePluginManifest(input);

      it('passes the manifest schema', () => {
        expect(parsed.ok).toBe(true);
      });

      it('is translated into all 13 locales with real, distinct text', () => {
        if (!parsed.ok) throw new Error('manifest invalid');
        const english = parsed.manifest.translations.en;
        const keys = Object.keys(parsed.manifest.translations).sort();
        expect(keys).toEqual([...locales].sort());
        for (const locale of locales.filter((candidate) => candidate !== Locale.EN)) {
          const text = Object.entries(parsed.manifest.translations).find(
            ([key]) => key === (locale as string),
          )?.[1];
          expect(text?.name.length).toBeGreaterThan(0);
          expect(text?.summary.length).toBeGreaterThan(0);
          expect(text?.description.length).toBeGreaterThan(0);
          expect(text?.description).not.toBe(english.description);
          expect(text?.summary).not.toBe(english.summary);
        }
      });

      it('names a registered adapter and keeps native tool names within the limit', () => {
        if (!parsed.ok) throw new Error('manifest invalid');
        expect(parsed.manifest.runtime.kind).toBe(RuntimeKind.BUILTIN);
        if (parsed.manifest.runtime.kind === RuntimeKind.BUILTIN) {
          expect(isRegisteredAdapterKey(parsed.manifest.runtime.adapterKey)).toBe(true);
        }
        for (const tool of parsed.manifest.tools) {
          expect(`plugin_${parsed.manifest.slug}_${tool.name}`.length).toBeLessThanOrEqual(
            NATIVE_TOOL_NAME_MAX,
          );
        }
      });

      it('is read-only, credential-free and unsigned-safe for the free plan', () => {
        if (!parsed.ok) throw new Error('manifest invalid');
        expect(parsed.manifest.auth.kind).toBe('NONE');
        expect(parsed.manifest.tools.every((tool) => tool.riskLevel === RiskLevel.READ)).toBe(true);
      });
    },
  );

  it('limits network access: only web-fetch may reach the public web', () => {
    const byslug = Object.fromEntries(
      FIRST_PARTY_MANIFESTS.map((manifest) => [manifest.slug, manifest.network]),
    );
    expect(byslug['web-fetch']).toEqual({ hosts: [], publicWeb: true });
    expect(byslug['datetime-and-math']).toEqual({ hosts: [], publicWeb: false });
    expect(byslug['weather']).toEqual({
      hosts: ['api.open-meteo.com', 'geocoding-api.open-meteo.com'],
      publicWeb: false,
    });
  });
});
