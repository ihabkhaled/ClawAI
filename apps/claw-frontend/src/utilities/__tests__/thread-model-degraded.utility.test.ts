import { describe, expect, it } from 'vitest';

import { ThreadModelAvailability } from '@/enums/thread-model-availability.enum';
import {
  annotateGroupsWithReasons,
  isSelectableAvailability,
  usableModels,
} from '@/utilities/thread-recommended-team.utility';

describe('degraded Thread models', () => {
  const index = new Map([
    ['GEMINI::flash', ThreadModelAvailability.Degraded],
    ['GROK::fast', ThreadModelAvailability.Available],
    ['OLLAMA::gone', ThreadModelAvailability.Unavailable],
  ]);

  it('lets a degraded model be picked by hand but never counts it as usable for ranking', () => {
    expect(isSelectableAvailability(ThreadModelAvailability.Degraded)).toBe(true);
    expect(isSelectableAvailability(ThreadModelAvailability.Available)).toBe(true);
    expect(isSelectableAvailability(ThreadModelAvailability.Unavailable)).toBe(false);
    expect(isSelectableAvailability(ThreadModelAvailability.NeedsPlan)).toBe(false);
    const models = [
      { provider: 'GEMINI', model: 'flash', displayName: 'Flash' },
      { provider: 'GROK', model: 'fast', displayName: 'Fast' },
    ];
    expect(usableModels(models, index).map(({ model }) => model)).toEqual(['fast']);
  });

  it('adds a warning to the degraded option label', () => {
    const groups = annotateGroupsWithReasons(
      [
        {
          key: 'GEMINI',
          label: 'Gemini',
          options: [{ value: 'GEMINI::flash', label: 'Flash' }],
        },
      ],
      index,
      (status) => `reason:${status}`,
    );
    expect(groups[0]?.options[0]?.label).toBe('Flash (reason:DEGRADED)');
  });
});
