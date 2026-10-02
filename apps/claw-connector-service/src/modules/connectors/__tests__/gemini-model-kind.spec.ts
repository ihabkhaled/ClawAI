import { vi } from 'vitest';
import { GeminiAdapter } from '../managers/adapters/gemini.adapter';
import { ConnectorModelsRepository } from '../repositories/connector-models.repository';
import type { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { NormalizedModel } from '../types/connectors.types';

vi.mock('../../../app/config/app.config', () => ({
  AppConfig: { get: vi.fn().mockReturnValue({ ENCRYPTION_KEY: 'a'.repeat(64) }) },
}));

const config = { provider: 'GEMINI', apiKey: 'g-key', baseUrl: undefined, region: undefined };

const respond = (body: unknown) => ({
  ok: true,
  status: 200,
  text: () => Promise.resolve(JSON.stringify(body)),
});

const entry = (id: string) => ({ id, object: 'model', owned_by: 'google' });

describe('GeminiAdapter kind from supportedGenerationMethods', () => {
  it('marks embedding and aqa models non-chat and leaves chat models CHAT', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        respond({
          object: 'list',
          data: [
            entry('models/gemini-2.5-flash'),
            entry('models/gemini-embedding-001'),
            entry('models/aqa'),
          ],
        }),
      )
      .mockResolvedValueOnce(
        respond({
          models: [
            { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
            { name: 'models/gemini-embedding-001', supportedGenerationMethods: ['embedContent'] },
            { name: 'models/aqa', supportedGenerationMethods: ['generateAnswer'] },
          ],
        }),
      );

    const models = await new GeminiAdapter().syncModels(config);
    const kinds = Object.fromEntries(models.map((model) => [model.modelKey, model.kind]));

    expect(kinds).toEqual({
      'models/gemini-2.5-flash': 'CHAT',
      'models/gemini-embedding-001': 'EMBEDDING',
      'models/aqa': 'TOOL',
    });
  });

  it('does not hide chat models when the native list is unavailable', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(respond({ object: 'list', data: [entry('models/gemini-2.5-flash')] }))
      .mockRejectedValueOnce(new Error('network down'));

    const models = await new GeminiAdapter().syncModels(config);

    expect(models[0]?.kind).toBe('CHAT');
  });
});

describe('ConnectorModelsRepository adapter-supplied kind', () => {
  const build = (kind?: NormalizedModel['kind']): NormalizedModel => ({
    modelKey: 'models/gemini-embedding-001',
    displayName: 'Embedding',
    lifecycle: 'ACTIVE',
    ...(kind === undefined ? {} : { kind }),
    capabilities: {
      supportsStreaming: true,
      supportsTools: false,
      supportsVision: false,
      supportsAudio: false,
      supportsVideoInput: false,
      supportsStructuredOutput: false,
    },
  });

  const run = async (model: NormalizedModel) => {
    const upsert = vi.fn().mockReturnValue({});
    const prisma = {
      connectorModel: { upsert, updateMany: vi.fn().mockReturnValue({}) },
      $transaction: vi.fn().mockResolvedValue([{ count: 0 }, {}]),
    };
    const repository = new ConnectorModelsRepository(prisma as unknown as PrismaService);
    await repository.replaceMany('c1', 'GEMINI' as never, [model]);
    return upsert.mock.calls[0]?.[0] as {
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    };
  };

  it('writes the non-chat kind and unexposes the row on update', async () => {
    const arg = await run(build('EMBEDDING'));
    expect(arg.create['kind']).toBe('EMBEDDING');
    expect(arg.update['kind']).toBe('EMBEDDING');
    expect(arg.update['exposure']).toBe('UNEXPOSED');
    expect('exposure' in arg.create).toBe(false);
  });

  it('writes nothing for a CHAT verdict or an absent kind', async () => {
    for (const kind of ['CHAT', undefined] as const) {
      const arg = await run(build(kind));
      expect('exposure' in arg.update).toBe(false);
    }
  });
});
