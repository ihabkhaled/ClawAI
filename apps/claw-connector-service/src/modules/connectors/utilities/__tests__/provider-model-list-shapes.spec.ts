import { ConnectorModelsResponseFormat } from '@claw/shared-types';
import { isPresetChatModel, parsePresetModelList } from '../preset-model-list.utility';

describe('provider-specific model list shapes', () => {
  it('reads a Pollinations catalog whose capabilities is a list, keeping only text-output models', () => {
    const body = {
      object: 'list',
      data: [
        {
          id: 'openai/gpt-5.4-nano',
          capabilities: ['tool_calling', 'reasoning'],
          input_modalities: ['text', 'image'],
          output_modalities: ['text'],
        },
        { id: 'black-forest-labs/flux', capabilities: [], output_modalities: ['image'] },
      ],
    };

    const entries = parsePresetModelList(ConnectorModelsResponseFormat.OPENAI_LIST, body);

    expect(entries.map((entry) => entry.id)).toEqual([
      'openai/gpt-5.4-nano',
      'black-forest-labs/flux',
    ]);
    expect(entries[0]?.functionCalling).toBe(true);
    expect(entries.filter((entry) => isPresetChatModel(entry)).map((entry) => entry.id)).toEqual([
      'openai/gpt-5.4-nano',
    ]);
  });

  it('reads an AI Horde bare array that names models with name and type text', () => {
    const body = [
      { name: 'aphrodite/Impish_LLAMA_4B', type: 'text', count: 5 },
      { name: '2DN', type: 'image', count: 3 },
    ];

    const entries = parsePresetModelList(ConnectorModelsResponseFormat.BARE_ARRAY, body);

    expect(entries.filter((entry) => isPresetChatModel(entry)).map((entry) => entry.id)).toEqual([
      'aphrodite/Impish_LLAMA_4B',
    ]);
  });
});
