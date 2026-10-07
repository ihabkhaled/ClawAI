import { ModelOutputPriceService } from '../model-output-price.service';

const snapshot = (provider: string, model: string, output: number | null, perUnit = false) => ({
  provider,
  model,
  outputPerMillionMicroUsd: output,
  imagePerUnitMicroUsd: perUnit ? 40_000 : null,
  audioPerUnitMicroUsd: null,
  videoPerUnitMicroUsd: null,
  ttsPerCharacterMicroUsd: null,
});

function build(rows: Array<ReturnType<typeof snapshot>> | Error) {
  const listActive = vi.fn(async () => {
    if (rows instanceof Error) {
      throw rows;
    }
    return rows;
  });
  return { listActive, service: new ModelOutputPriceService({ listActive } as never) };
}

describe('ModelOutputPriceService', () => {
  const rows = [
    snapshot('ANTHROPIC', 'claude-opus-5-5', 25_000_000),
    snapshot('GEMINI', 'gemini-2.5-flash', 2_500_000),
    snapshot('OLLAMA', 'glm-5.2', 0),
    snapshot('OPENAI', 'unpriced', null),
  ];

  it('says nothing is dear when the plan has no limit, without reading prices', async () => {
    const { service, listActive } = build(rows);

    const isAbove = await service.buildChecker(null);

    expect(isAbove('ANTHROPIC', 'claude-opus-5-5')).toBe(false);
    expect(listActive).not.toHaveBeenCalled();
  });

  it('flags only models whose output price is above the limit', async () => {
    const { service } = build(rows);

    const isAbove = await service.buildChecker(5_000_000);

    expect(isAbove('ANTHROPIC', 'claude-opus-5-5')).toBe(true);
    expect(isAbove('GEMINI', 'gemini-2.5-flash')).toBe(false);
    expect(isAbove('OLLAMA', 'glm-5.2')).toBe(false);
  });

  it('matches a model however the provider decorates its id', async () => {
    const { service } = build(rows);

    const isAbove = await service.buildChecker(5_000_000);

    expect(isAbove('anthropic', 'claude-opus-5-5')).toBe(true);
    expect(isAbove('GEMINI', 'models/gemini-2.5-flash')).toBe(false);
  });

  it('does not judge a model with no price: auth-service refuses an unpriced credit model itself', async () => {
    const { service } = build(rows);

    const isAbove = await service.buildChecker(0);

    expect(isAbove('OPENAI', 'unpriced')).toBe(false);
    expect(isAbove('SOMEONE', 'unknown-model')).toBe(false);
    expect(isAbove('GEMINI', 'gemini-2.5-flash')).toBe(true);
  });

  it('judges a model with no price of its own by the dearest chat model its provider sells', async () => {
    const { service } = build([
      snapshot('GEMINI', 'gemini-2.5-flash', 2_500_000),
      snapshot('GEMINI', 'gemini-2.5-pro', 10_000_000),
      snapshot('GEMINI', 'gemini-image', 120_000_000, true),
      snapshot('GROQ', 'llama-fast', 600_000),
    ]);

    const isAbove = await service.buildChecker(5_000_000);

    // GEMINI's dearest chat model is the $10 one (the image model's price does not count).
    expect(isAbove('GEMINI', 'models/gemini-9-new')).toBe(true);
    // GROQ's dearest chat model is $0.60, so a new GROQ model is covered.
    expect(isAbove('GROQ', 'llama-newest')).toBe(false);
    // A provider with no priced model at all cannot be judged.
    expect(isAbove('MISTRAL', 'mistral-large')).toBe(false);
  });

  it('reads the price table once for a minute, then again', async () => {
    const { service, listActive } = build(rows);

    await service.buildChecker(5_000_000, 1_000);
    await service.buildChecker(5_000_000, 30_000);
    expect(listActive).toHaveBeenCalledTimes(1);

    await service.buildChecker(5_000_000, 70_000);
    expect(listActive).toHaveBeenCalledTimes(2);
  });

  it('applies no limit when the price table cannot be read, rather than failing the request', async () => {
    const { service } = build(new Error('db down'));

    const isAbove = await service.buildChecker(5_000_000);

    expect(isAbove('ANTHROPIC', 'claude-opus-5-5')).toBe(false);
  });
});
