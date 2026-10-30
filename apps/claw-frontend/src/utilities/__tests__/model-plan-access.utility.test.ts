import { describe, expect, it } from 'vitest';

import type { ModelPickerGroup } from '@/types';
import { hashModelCatalogue, isLockedOption } from '@/utilities/model-plan-access.utility';

const a = { provider: 'OPENAI', model: 'gpt-5.4-mini' };
const b = { provider: 'GROK', model: 'grok-4.7' };

describe('hashModelCatalogue', () => {
  it('is the same whatever order the catalogue arrives in', () => {
    expect(hashModelCatalogue([a, b])).toBe(hashModelCatalogue([b, a]));
  });

  it('changes when a model is added, removed or renamed', () => {
    const base = hashModelCatalogue([a, b]);
    expect(hashModelCatalogue([a])).not.toBe(base);
    expect(hashModelCatalogue([a, { ...b, model: 'grok-4.8' }])).not.toBe(base);
  });

  it('stays short however long the catalogue is', () => {
    const many = Array.from({ length: 800 }, (_, index) => ({
      provider: 'OPENROUTER',
      model: `vendor-${String(index)}/some-long-model-name`,
    }));
    expect(hashModelCatalogue(many).length).toBeLessThan(20);
  });
});

describe('isLockedOption', () => {
  const groups: ModelPickerGroup[] = [
    {
      key: 'g',
      label: 'g',
      options: [
        { value: 'GROK::grok-4.7', label: 'Grok', isLocked: true },
        { value: 'OPENAI::gpt-5.4-mini', label: 'GPT' },
      ],
    },
  ];

  it('is true only for an option flagged as outside the plan', () => {
    expect(isLockedOption(groups, 'GROK::grok-4.7')).toBe(true);
    expect(isLockedOption(groups, 'OPENAI::gpt-5.4-mini')).toBe(false);
    expect(isLockedOption(groups, 'NOPE::missing')).toBe(false);
  });
});
