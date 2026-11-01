import {
  classifyMediaOutputModel,
  PRICED_MEDIA_MODEL_KEYS_BY_PROVIDER,
} from '@claw/shared-utilities';
import { describe, expect, it } from 'vitest';
import { MODEL_COST_SEED_ENTRIES } from '../constants/model-cost-seed.constants';

// connector-service exposes exactly these media models (policy: priced = offered, with the cost
// class of its seed row). This keeps the list and the cost seed from drifting apart.
describe('priced media models vs the cost seed', () => {
  it('every exposed media model has a seeded price with a cost class', () => {
    for (const [provider, keys] of PRICED_MEDIA_MODEL_KEYS_BY_PROVIDER) {
      for (const key of keys) {
        const entry = MODEL_COST_SEED_ENTRIES.find(
          (e) => e.provider === provider && e.modelKey === key,
        );
        expect(entry, `${provider}/${key} is exposed but not priced`).toBeDefined();
        expect(entry?.costClass, `${provider}/${key} has no cost class`).toBeDefined();
      }
    }
  });

  it('every seeded media model of a first-party provider is on the exposure list', () => {
    for (const entry of MODEL_COST_SEED_ENTRIES) {
      const keys = PRICED_MEDIA_MODEL_KEYS_BY_PROVIDER.get(entry.provider);
      if (keys === undefined) continue;
      if (classifyMediaOutputModel(entry.modelKey, entry.provider) === undefined) continue;
      expect(
        keys.has(entry.modelKey),
        `${entry.provider}/${entry.modelKey} is priced but not exposed`,
      ).toBe(true);
    }
  });
});
