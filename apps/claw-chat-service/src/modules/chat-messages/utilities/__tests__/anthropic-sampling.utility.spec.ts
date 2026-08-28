import { modelRejectsSamplingParams } from '../anthropic-sampling.utility';

describe('modelRejectsSamplingParams', () => {
  // Sending `temperature` to one of these is a 400, not a warning, so a thread
  // carrying any temperature fails every turn on them.
  it.each([
    'claude-fable-5',
    'claude-mythos-5',
    'claude-opus-5',
    'claude-opus-4-8',
    'claude-opus-4-7',
    'claude-sonnet-5',
  ])('reports that %s rejects sampling params', (model) => {
    expect(modelRejectsSamplingParams(model)).toBe(true);
  });

  // These still accept sampling. Dropping temperature for them would silently
  // change answers that users have tuned.
  it.each([
    'claude-opus-4-6',
    'claude-sonnet-4-6',
    'claude-opus-4-5-20251101',
    'claude-sonnet-4-5-20250929',
    'claude-haiku-4-5-20251001',
  ])('reports that %s still accepts sampling params', (model) => {
    expect(modelRejectsSamplingParams(model)).toBe(false);
  });

  it('matches a dated snapshot of a model that rejects sampling', () => {
    expect(modelRejectsSamplingParams('claude-opus-5-20260101')).toBe(true);
  });

  it('tolerates padding and casing from a stored thread setting', () => {
    expect(modelRejectsSamplingParams('  Claude-Opus-5  ')).toBe(true);
  });

  it('leaves other providers alone', () => {
    expect(modelRejectsSamplingParams('gpt-5.6-sol')).toBe(false);
    expect(modelRejectsSamplingParams('llama3.1:8b')).toBe(false);
  });
});
