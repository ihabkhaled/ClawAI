import { SamplingParameterSupportManager } from '../sampling-parameter-support.manager';
import {
  LEARNED_SAMPLING_REJECTION_MAX_ENTRIES,
  LEARNED_SAMPLING_REJECTION_TTL_MS,
} from '../../constants/sampling-parameter.constants';

describe('SamplingParameterSupportManager', () => {
  const NOW = 1_000_000;
  let support: SamplingParameterSupportManager;

  beforeEach(() => {
    SamplingParameterSupportManager.forgetAll();
    support = new SamplingParameterSupportManager();
  });

  it('knows nothing until a refusal is recorded', () => {
    expect(support.rejects('claude-opus-5-5', 'temperature', NOW)).toBe(false);
  });

  it('remembers a recorded refusal, per parameter', () => {
    support.record('claude-opus-5-5', 'temperature', NOW);
    expect(support.rejects('claude-opus-5-5', 'temperature', NOW + 1)).toBe(true);
    expect(support.rejects('claude-opus-5-5', 'top_p', NOW + 1)).toBe(false);
    expect(support.rejects('claude-sonnet-5-5', 'temperature', NOW + 1)).toBe(false);
  });

  it('is shared across instances (process-wide, like every replica-local cache)', () => {
    support.record('claude-opus-5-5', 'temperature', NOW);
    expect(new SamplingParameterSupportManager().rejects('claude-opus-5-5', 'temperature', NOW)).toBe(
      true,
    );
  });

  it('normalises padding and casing of the model id', () => {
    support.record('  Claude-Opus-5-5 ', 'temperature', NOW);
    expect(support.rejects('claude-opus-5-5', 'temperature', NOW)).toBe(true);
  });

  it('forgets a refusal after the TTL so a restored parameter comes back', () => {
    support.record('claude-opus-5-5', 'temperature', NOW);
    expect(
      support.rejects('claude-opus-5-5', 'temperature', NOW + LEARNED_SAMPLING_REJECTION_TTL_MS),
    ).toBe(false);
  });

  it('stays bounded: the oldest entry is evicted at the cap', () => {
    for (let index = 0; index < LEARNED_SAMPLING_REJECTION_MAX_ENTRIES; index += 1) {
      support.record(`model-${String(index)}`, 'temperature', NOW);
    }
    support.record('model-new', 'temperature', NOW);
    expect(support.rejects('model-0', 'temperature', NOW)).toBe(false);
    expect(support.rejects('model-1', 'temperature', NOW)).toBe(true);
    expect(support.rejects('model-new', 'temperature', NOW)).toBe(true);
  });
});
