import { describe, expect, it } from 'vitest';

import { LIVE_MODEL_CURRENT_GROUP_KEY } from '@/constants/live-model-chain.constants';
import {
  LiveModelChainDirection,
  LiveModelChainKind,
  LiveModelStyle,
} from '@/enums/live-model-chain.enum';
import type { GroupedModels } from '@/types/component.types';
import type { LiveModelChains } from '@/types/live-admin.types';
import {
  liveModelChainAdd,
  liveModelChainMove,
  liveModelChainRemove,
  liveModelPickerGroups,
  liveModelRefFromValue,
  liveModelRefValue,
} from '@/utilities/live-model-chain.utility';

const a = { connector: 'OLLAMA', model: 'gemma4:31b', style: 'OLLAMA' };
const b = { connector: 'OLLAMA', model: 'deepseek-v4.1-flash', style: 'OLLAMA' };
const c = { connector: 'GEMINI', model: 'gemini-3.1-flash-lite', style: 'OPENAI_COMPAT' };

const GROUPED: GroupedModels[] = [
  {
    provider: 'GEMINI',
    label: 'Google Gemini',
    models: [
      { provider: 'GEMINI', model: 'gemini-3.1-flash-lite', displayName: 'Gemini Flash Lite' },
    ],
  },
  {
    provider: 'OLLAMA',
    label: 'Ollama (Connector)',
    models: [{ provider: 'OLLAMA', model: 'gemma4:31b', displayName: 'Gemma 4', isLocked: true }],
  },
  {
    provider: 'OPENAI',
    label: 'OpenAI',
    models: [{ provider: 'OPENAI', model: 'gpt-5', displayName: 'GPT 5' }],
  },
];

describe('picked chat model -> policy model ref', () => {
  it('maps Ollama to the native style and Gemini to the OpenAI-compatible style', () => {
    expect(liveModelRefFromValue('OLLAMA::gemma4:31b')).toEqual({
      connector: 'OLLAMA',
      model: 'gemma4:31b',
      style: LiveModelStyle.OLLAMA,
    });
    expect(liveModelRefFromValue('GEMINI::gemini-3.1-flash-lite')).toEqual({
      connector: 'GEMINI',
      model: 'gemini-3.1-flash-lite',
      style: LiveModelStyle.OPENAI_COMPAT,
    });
  });

  it('refuses a provider Live cannot call, a local model and an empty pick', () => {
    expect(liveModelRefFromValue('OPENAI::gpt-5')).toBeNull();
    expect(liveModelRefFromValue('local-ollama::qwen3:1.7b')).toBeNull();
    expect(liveModelRefFromValue(null)).toBeNull();
    expect(liveModelRefFromValue('garbage')).toBeNull();
  });

  it('encodes a stored ref as the chat picker value', () => {
    expect(liveModelRefValue(a)).toBe('OLLAMA::gemma4:31b');
  });
});

describe('chain edits', () => {
  it('moves a row up and down, and ignores a move past either end', () => {
    expect(liveModelChainMove([a, b, c], 1, LiveModelChainDirection.UP)).toEqual([b, a, c]);
    expect(liveModelChainMove([a, b, c], 1, LiveModelChainDirection.DOWN)).toEqual([a, c, b]);
    const chain = [a, b];
    expect(liveModelChainMove(chain, 0, LiveModelChainDirection.UP)).toBe(chain);
    expect(liveModelChainMove(chain, 1, LiveModelChainDirection.DOWN)).toBe(chain);
  });

  it('removes a row but never the last one', () => {
    expect(liveModelChainRemove(LiveModelChainKind.SUMMARY, [a, b, c], 1)).toEqual([a, c]);
    expect(liveModelChainRemove(LiveModelChainKind.COUNCIL, [a], 0)).toEqual([a]);
  });

  it('adds a copy of the last row up to the maximum (main 5, council 3)', () => {
    expect(liveModelChainAdd(LiveModelChainKind.COUNCIL, [a, c])).toEqual([a, c, c]);
    expect(liveModelChainAdd(LiveModelChainKind.COUNCIL, [a, b, c])).toEqual([a, b, c]);
    const four = [a, b, c, a];
    expect(liveModelChainAdd(LiveModelChainKind.SUMMARY, four)).toHaveLength(5);
    expect(liveModelChainAdd(LiveModelChainKind.SUMMARY, [...four, b])).toHaveLength(5);
  });
});

describe('picker groups', () => {
  const chains: LiveModelChains = {
    [LiveModelChainKind.SUMMARY]: [
      a,
      { connector: 'OLLAMA', model: 'retired:1b', style: 'OLLAMA' },
    ],
    [LiveModelChainKind.VISION]: [c],
    [LiveModelChainKind.COUNCIL]: [c],
  };

  it('keeps every chat provider, disabling the ones Live cannot call with the reason', () => {
    const groups = liveModelPickerGroups(GROUPED, null, 'unsupported', 'current');
    const options = groups.flatMap((group) => group.options);
    expect(options.find((o) => o.value === 'OPENAI::gpt-5')).toMatchObject({
      isLocked: true,
      lockedLabel: 'unsupported',
    });
    // The admin's own plan lock does not apply: the platform pays for Live.
    expect(options.find((o) => o.value === 'OLLAMA::gemma4:31b')?.isLocked).toBe(false);
    expect(options.find((o) => o.value === 'GEMINI::gemini-3.1-flash-lite')?.isLocked).toBe(false);
  });

  it('keeps a stored model the catalogue no longer lists selectable, first', () => {
    const groups = liveModelPickerGroups(GROUPED, chains, 'unsupported', 'current');
    expect(groups[0]).toEqual({
      key: LIVE_MODEL_CURRENT_GROUP_KEY,
      label: 'current',
      options: [
        {
          value: 'OLLAMA::retired:1b',
          label: 'retired:1b',
          isLocked: false,
          lockedLabel: undefined,
        },
      ],
    });
    expect(groups).toHaveLength(4);
  });
});
