import { chainDslSchema } from '../../dto/chain.dto';
import { parseProviderPlaceholder } from '../../utilities/chain-template-placeholder.utility';
import { CHAIN_TEMPLATE_SEEDS } from '../chain-template-seeds.constants';

describe('CHAIN_TEMPLATE_SEEDS', () => {
  it('has unique keys', () => {
    const keys = CHAIN_TEMPLATE_SEEDS.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it.each(CHAIN_TEMPLATE_SEEDS)(
    '$key: every step connectorId placeholder resolves to a provider in requiredProviders',
    (seed) => {
      const referenced = new Set(
        seed.dslTemplate.steps
          .map((step) => parseProviderPlaceholder(step.connectorId))
          .filter((p): p is string => p !== null),
      );
      // Every placeholder actually used in the DSL must be declared as required...
      for (const provider of referenced) {
        expect(seed.requiredProviders).toContain(provider);
      }
      // ...and every declared required provider must actually be used somewhere,
      // or requiredProviders would demand a connector the template never needs.
      for (const provider of seed.requiredProviders) {
        expect(referenced.has(provider)).toBe(true);
      }
    },
  );

  it.each(CHAIN_TEMPLATE_SEEDS)(
    '$key: no step connectorId is a real (non-placeholder) value',
    (seed) => {
      for (const step of seed.dslTemplate.steps) {
        expect(parseProviderPlaceholder(step.connectorId)).not.toBeNull();
      }
    },
  );

  it.each(CHAIN_TEMPLATE_SEEDS)(
    '$key: dslTemplate would pass chainDslSchema once placeholders are resolved to real ids',
    (seed) => {
      const resolved = {
        steps: seed.dslTemplate.steps.map((step) => ({
          ...step,
          connectorId: 'cuid-placeholder-123',
        })),
      };
      expect(() => chainDslSchema.parse(resolved)).not.toThrow();
    },
  );
});
