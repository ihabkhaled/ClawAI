import { RuntimeKind } from '../../../common/enums/runtime-kind.enum';
import { parsePluginManifest } from '../../catalog/utilities/parse-plugin-manifest.utility';
import { FIRST_PARTY_MANIFESTS } from '../../seeding/constants/first-party-manifests.constants';
import { BUILTIN_ADAPTER_KEYS } from '../constants/adapter-registry.constants';
import { isRegisteredAdapterKey } from '../utilities/is-registered-adapter.utility';

describe('built-in adapter registry', () => {
  it('resolves every published BUILTIN manifest to a registered adapter key', () => {
    for (const input of FIRST_PARTY_MANIFESTS) {
      const parsed = parsePluginManifest(input);
      if (!parsed.ok) throw new Error(`${input.slug} is invalid`);
      if (parsed.manifest.runtime.kind === RuntimeKind.BUILTIN) {
        expect(isRegisteredAdapterKey(parsed.manifest.runtime.adapterKey)).toBe(true);
      }
    }
  });

  it('has no registered key that no manifest uses', () => {
    const used = FIRST_PARTY_MANIFESTS.flatMap((manifest) =>
      manifest.runtime.kind === RuntimeKind.BUILTIN ? [manifest.runtime.adapterKey] : [],
    );
    expect([...BUILTIN_ADAPTER_KEYS].sort()).toEqual([...used].sort());
  });

  it('rejects unknown, empty and prototype-chain keys', () => {
    for (const key of ['', 'shell', 'WEB-FETCH', 'constructor', '__proto__', 'web-fetch ']) {
      expect(isRegisteredAdapterKey(key)).toBe(false);
    }
    expect(isRegisteredAdapterKey('weather')).toBe(true);
  });
});
