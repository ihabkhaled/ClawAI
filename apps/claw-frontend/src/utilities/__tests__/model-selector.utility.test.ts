import { describe, expect, it } from 'vitest';

import type { JudgeModelOption } from '../../types/chat.types';
import type { GroupedModels } from '../../types/component.types';
import type { LocalModel } from '../../types/routing.types';
import {
  getLocalModelSpecificationLabels,
  groupedModelsToPickerGroups,
  judgeModelOptionsToPickerGroups,
} from '../model-selector.utility';

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

describe('groupedModelsToPickerGroups', () => {
  it('flattens each group into normalized options with encoded values', () => {
    const groupedModels: GroupedModels[] = [
      {
        provider: 'local-ollama',
        label: 'Ollama (Local)',
        models: [
          { provider: 'local-ollama', model: 'qwen3:1.7b', displayName: 'qwen3:1.7b (local)' },
        ],
      },
      {
        provider: 'OPENAI',
        label: 'OpenAI',
        models: [{ provider: 'OPENAI', model: 'gpt-4.1', displayName: 'GPT-4.1' }],
      },
    ];

    expect(groupedModelsToPickerGroups(groupedModels)).toEqual([
      {
        key: 'local-ollama',
        label: 'Ollama (Local)',
        options: [
          {
            value: 'local-ollama::qwen3:1.7b',
            label: 'qwen3:1.7b (local)',
            specifications: undefined,
          },
        ],
      },
      {
        key: 'OPENAI',
        label: 'OpenAI',
        options: [{ value: 'OPENAI::gpt-4.1', label: 'GPT-4.1', specifications: undefined }],
      },
    ]);
  });

  it('returns an empty array for an empty catalog', () => {
    expect(groupedModelsToPickerGroups([])).toEqual([]);
  });
});

describe('judgeModelOptionsToPickerGroups', () => {
  it('wraps concrete options in a single ungrouped group', () => {
    const options: JudgeModelOption[] = [
      { value: 'OPENAI:gpt-4.1', label: 'OPENAI · gpt-4.1' },
      { value: 'gemma3:4b', label: 'gemma3:4b' },
    ];

    expect(judgeModelOptionsToPickerGroups(options)).toEqual([
      {
        key: 'judge-models',
        label: '',
        options: [
          { value: 'OPENAI:gpt-4.1', label: 'OPENAI · gpt-4.1' },
          { value: 'gemma3:4b', label: 'gemma3:4b' },
        ],
      },
    ]);
  });

  it('drops the null-value auto entry — ModelPicker renders its own autoOption instead', () => {
    const options: JudgeModelOption[] = [
      { value: null, label: 'Auto' },
      { value: 'gemma3:4b', label: 'gemma3:4b' },
    ];

    expect(judgeModelOptionsToPickerGroups(options)).toEqual([
      { key: 'judge-models', label: '', options: [{ value: 'gemma3:4b', label: 'gemma3:4b' }] },
    ]);
  });

  it('returns an empty array when every option is null-value (auto only)', () => {
    expect(judgeModelOptionsToPickerGroups([{ value: null, label: 'Auto' }])).toEqual([]);
  });
});
