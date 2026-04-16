import { describe, expect, it } from 'vitest';

import type { LocalModel } from '../../types/routing.types';
import { getLocalModelSpecificationLabels } from '../model-selector.utility';

function createLocalModel(overrides: Partial<LocalModel> = {}): LocalModel {
  return {
    id: 'model-1',
    name: 'llama3',
    tag: 'latest',
    runtime: 'OLLAMA',
    sizeBytes: null,
    family: 'llama',
    parameters: '8B',
    category: null,
    isInstalled: true,
    roles: [],
    ...overrides,
  };
}

describe('model-selector.utility', () => {
  it('uses active Ollama role assignments as model specifications', () => {
    const labels = getLocalModelSpecificationLabels(
      createLocalModel({
        roles: [
          { role: 'ROUTER', isActive: true },
          { role: 'LOCAL_THINKING', isActive: true },
          { role: 'LOCAL_CODING', isActive: false },
        ],
      }),
    );

    expect(labels).toEqual(['Routing', 'Thinking']);
  });

  it('falls back to the catalog category when there are no active roles', () => {
    const labels = getLocalModelSpecificationLabels(createLocalModel({ category: 'REASONING' }));

    expect(labels).toEqual(['Reasoning']);
  });

  it('defaults unclassified local models to chatting', () => {
    const labels = getLocalModelSpecificationLabels(createLocalModel());

    expect(labels).toEqual(['Chatting']);
  });
});
