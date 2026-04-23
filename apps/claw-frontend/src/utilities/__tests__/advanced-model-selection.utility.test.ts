import { describe, expect, it } from 'vitest';

import { buildAdvancedModelSelectionPayload } from '@/utilities';

describe('buildAdvancedModelSelectionPayload', () => {
  it('builds AUTO payload when no model is selected', () => {
    expect(buildAdvancedModelSelectionPayload(null)).toEqual({
      modelSelectionMode: 'AUTO',
    });
  });

  it('builds MANUAL_MODEL payload for a local model selection', () => {
    expect(
      buildAdvancedModelSelectionPayload({
        provider: 'local-ollama',
        model: 'qwen2.5:7b',
        displayName: 'qwen2.5:7b',
      }),
    ).toEqual({
      modelSelectionMode: 'MANUAL_MODEL',
      requestedProvider: 'local-ollama',
      requestedModel: 'qwen2.5:7b',
      requestedDisplayName: 'qwen2.5:7b',
      selectedModelSource: 'LOCAL',
    });
  });
});
