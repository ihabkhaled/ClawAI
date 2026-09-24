import { CONNECTOR_PRESETS } from '@claw/shared-utilities';
import { RouterProvider } from '../../../generated/prisma';
import { CONNECTOR_PROVIDER_TO_ROUTER_PROVIDER } from '../constants/model-discovery.constants';

/**
 * Batch 2 (connector presets, ADR-116/117): connector-service's
 * ConnectorProvider gained 15 OpenAI-compatible providers
 * (20260923120000_add_openai_compatible_presets), but RouterProvider — the
 * enum model discovery writes deployment rows under — had no matching
 * values, so a discovered OpenRouter/Groq/etc. model had no enum value to be
 * persisted as and was silently undiscoverable. This spec pins that every
 * preset now has a same-named RouterProvider value and a discovery mapping,
 * so a future drift between the two registries fails a test instead of
 * failing silently at insert time.
 */
describe('CONNECTOR_PROVIDER_TO_ROUTER_PROVIDER (batch 2 presets)', () => {
  it.each(CONNECTOR_PRESETS.map((preset) => preset.key))(
    'maps preset %s to a RouterProvider of the same name',
    (key) => {
      expect(CONNECTOR_PROVIDER_TO_ROUTER_PROVIDER[key]).toBe(key);
      // Fails loudly if the Prisma enum migration was skipped: RouterProvider
      // would not have this member and the lookup above would be undefined.
      expect(Object.values(RouterProvider)).toContain(key);
    },
  );
});
