import { ConnectorProvider } from '../../../../generated/prisma';
import { PublicModelCatalogService } from '../public-model-catalog.service';
import type { ConnectorModelsRepository } from '../../repositories/connector-models.repository';

type Row = {
  provider: ConnectorProvider;
  modelKey: string;
  displayName: string;
  maxContextTokens: number | null;
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsVision: boolean;
  supportsAudio: boolean;
  supportsStructuredOutput: boolean;
  usageTier: string;
  inputUsdPerMillion: string | null;
  outputUsdPerMillion: string | null;
  connectorId: string;
};

function row(provider: ConnectorProvider, modelKey: string, overrides: Partial<Row> = {}): Row {
  return {
    provider,
    modelKey,
    displayName: modelKey,
    maxContextTokens: 128_000,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: false,
    supportsAudio: false,
    supportsStructuredOutput: true,
    usageTier: 'MEDIUM',
    inputUsdPerMillion: '1.250000',
    outputUsdPerMillion: '10.000000',
    connectorId: 'connector-secret-id',
    ...overrides,
  };
}

function build(rows: Row[]): {
  service: PublicModelCatalogService;
  repository: { findExposedForCatalog: jest.Mock };
} {
  const repository = { findExposedForCatalog: jest.fn().mockResolvedValue(rows) };
  return {
    service: new PublicModelCatalogService(repository as unknown as ConnectorModelsRepository),
    repository,
  };
}

describe('PublicModelCatalogService', () => {
  // The whole point: the public list is the same list the composer offers, so
  // it reads through the shared exposed-for-catalog query rather than a seed or
  // a static file.
  it('reads the same exposed-model query the in-app picker uses', async () => {
    const ctx = build([row(ConnectorProvider.OPENAI, 'gpt-5')]);
    await ctx.service.getCatalog();
    expect(ctx.repository.findExposedForCatalog).toHaveBeenCalledTimes(1);
  });

  it('groups models under their provider with a human-facing name', async () => {
    const ctx = build([
      row(ConnectorProvider.OPENAI, 'gpt-5'),
      row(ConnectorProvider.OPENAI, 'gpt-5-mini'),
      row(ConnectorProvider.GEMINI, 'gemini-2.5-pro'),
    ]);

    const catalog = await ctx.service.getCatalog();

    expect(catalog.providers).toHaveLength(2);
    const openai = catalog.providers.find((p) => p.provider === ConnectorProvider.OPENAI);
    expect(openai?.displayName).toBe('OpenAI');
    expect(openai?.modelCount).toBe(2);
    expect(
      catalog.providers.find((p) => p.provider === ConnectorProvider.GEMINI)?.displayName,
    ).toBe('Google Gemini');
  });

  it('reports totals a page can headline without re-summing', async () => {
    const ctx = build([
      row(ConnectorProvider.OPENAI, 'gpt-5'),
      row(ConnectorProvider.ANTHROPIC, 'claude-opus-4'),
      row(ConnectorProvider.ANTHROPIC, 'claude-sonnet-4'),
    ]);

    const catalog = await ctx.service.getCatalog();

    expect(catalog.totalModelCount).toBe(3);
    expect(catalog.providerCount).toBe(2);
  });

  // Rule 37: a provider rate must never appear in a non-admin response, and a
  // public page is the least-admin surface there is.
  it('NEVER exposes a price, a rate or a connector identity', async () => {
    const ctx = build([row(ConnectorProvider.OPENAI, 'gpt-5')]);

    const serialised = JSON.stringify(await ctx.service.getCatalog());

    expect(serialised).not.toContain('1.250000');
    expect(serialised).not.toContain('10.000000');
    expect(serialised).not.toContain('UsdPerMillion');
    expect(serialised).not.toContain('connector-secret-id');
    expect(serialised).not.toContain('connectorId');
  });

  it('carries the capabilities and context window a page needs', async () => {
    const ctx = build([
      row(ConnectorProvider.GEMINI, 'gemini-2.5-pro', {
        displayName: 'Gemini 2.5 Pro',
        maxContextTokens: 1_048_576,
        supportsVision: true,
        usageTier: 'HIGH',
      }),
    ]);

    const [model] = (await ctx.service.getCatalog()).providers[0]?.models ?? [];

    expect(model).toEqual({
      modelKey: 'gemini-2.5-pro',
      displayName: 'Gemini 2.5 Pro',
      maxContextTokens: 1_048_576,
      supportsStreaming: true,
      supportsTools: true,
      supportsVision: true,
      supportsAudio: false,
      supportsStructuredOutput: true,
      usageTier: 'HIGH',
    });
  });

  // A page whose sections reshuffle between deploys breaks anchor links and
  // reads as two different pages. Order must not depend on model counts.
  it('orders providers by the fixed public order, not by model count', async () => {
    const ctx = build([
      row(ConnectorProvider.OLLAMA, 'llama3'),
      row(ConnectorProvider.OLLAMA, 'llama3-70b'),
      row(ConnectorProvider.OLLAMA, 'mistral'),
      row(ConnectorProvider.OPENAI, 'gpt-5'),
    ]);

    const catalog = await ctx.service.getCatalog();

    expect(catalog.providers.map((p) => p.provider)).toEqual([
      ConnectorProvider.OPENAI,
      ConnectorProvider.OLLAMA,
    ]);
  });

  it('returns an empty catalog rather than throwing when nothing is connected', async () => {
    const ctx = build([]);

    const catalog = await ctx.service.getCatalog();

    expect(catalog.providers).toEqual([]);
    expect(catalog.totalModelCount).toBe(0);
    expect(catalog.providerCount).toBe(0);
    expect(catalog.generatedAt).toEqual(expect.any(String));
  });
});
