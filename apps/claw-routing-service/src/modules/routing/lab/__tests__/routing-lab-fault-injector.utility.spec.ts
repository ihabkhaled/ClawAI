import { RouterErrorCode } from '../../../../common/enums';
import { RouterProvider } from '../../../../generated/prisma';
import { ROUTING_LAB_DEFAULT_SNAPSHOT } from '../constants/routing-lab-fixture-chain.constants';
import { buildRoutingLabProviderAdapters } from '../utilities/routing-lab-fault-injector.utility';

const REQUEST = {
  traceId: 't1',
  prompt: 'hi',
  providerModelId: 'model',
  deploymentId: 'dep',
  timeoutMs: 1_000,
};

describe('buildRoutingLabProviderAdapters', () => {
  it('defaults an unfaulted provider to a scripted success naming the chain default', async () => {
    const { gemini } = buildRoutingLabProviderAdapters(ROUTING_LAB_DEFAULT_SNAPSHOT, {});
    const response = await gemini.invoke(REQUEST);

    expect(response.ok).toBe(true);
    if (response.ok) {
      const parsed: { deploymentId: string } = JSON.parse(response.raw);
      expect(parsed.deploymentId).toBe('lab_dep_gemini_primary');
    }
  });

  it('returns a direct provider failure for an ordinary FAULT code', async () => {
    const { gemini } = buildRoutingLabProviderAdapters(ROUTING_LAB_DEFAULT_SNAPSHOT, {
      [RouterProvider.GEMINI]: [{ outcome: 'FAULT', code: RouterErrorCode.TIMEOUT }],
    });

    const response = await gemini.invoke(REQUEST);
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.code).toBe(RouterErrorCode.TIMEOUT);
    }
  });

  it('fabricates an ok:true malformed answer for MALFORMED_STRUCTURED_OUTPUT', async () => {
    const { gemini } = buildRoutingLabProviderAdapters(ROUTING_LAB_DEFAULT_SNAPSHOT, {
      [RouterProvider.GEMINI]: [
        { outcome: 'FAULT', code: RouterErrorCode.MALFORMED_STRUCTURED_OUTPUT },
      ],
    });

    const response = await gemini.invoke(REQUEST);
    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(() => JSON.parse(response.raw)).toThrow();
    }
  });

  it('fabricates an ok:true valid decision below the confidence floor for LOW_CONFIDENCE', async () => {
    const { gemini } = buildRoutingLabProviderAdapters(ROUTING_LAB_DEFAULT_SNAPSHOT, {
      [RouterProvider.GEMINI]: [{ outcome: 'FAULT', code: RouterErrorCode.LOW_CONFIDENCE }],
    });

    const response = await gemini.invoke(REQUEST);
    expect(response.ok).toBe(true);
    if (response.ok) {
      const parsed: { confidence: number } = JSON.parse(response.raw);
      expect(parsed.confidence).toBeLessThan(0.75);
    }
  });

  it('repeats the last scripted step once the queue is exhausted', async () => {
    const { gemini } = buildRoutingLabProviderAdapters(ROUTING_LAB_DEFAULT_SNAPSHOT, {
      [RouterProvider.GEMINI]: [
        { outcome: 'FAULT', code: RouterErrorCode.TIMEOUT },
        { outcome: 'SUCCESS', deploymentId: 'lab_dep_gemini_primary' },
      ],
    });

    await gemini.invoke(REQUEST);
    const second = await gemini.invoke(REQUEST);
    const third = await gemini.invoke(REQUEST);

    expect(second.ok).toBe(true);
    expect(third.ok).toBe(true);
  });

  it('honors an explicit deploymentId on a SUCCESS step over the chain default', async () => {
    const { ollamaCloud } = buildRoutingLabProviderAdapters(ROUTING_LAB_DEFAULT_SNAPSHOT, {
      [RouterProvider.OLLAMA_CLOUD]: [
        { outcome: 'SUCCESS', deploymentId: 'lab_dep_ollama_cloud_qwen' },
      ],
    });

    const response = await ollamaCloud.invoke(REQUEST);
    expect(response.ok).toBe(true);
    if (response.ok) {
      const parsed: { deploymentId: string } = JSON.parse(response.raw);
      expect(parsed.deploymentId).toBe('lab_dep_ollama_cloud_qwen');
    }
  });

  it('fails UNKNOWN when a provider has no chain default and no scripted deploymentId', async () => {
    const { legacyLocal } = buildRoutingLabProviderAdapters(null, {});
    const response = await legacyLocal.invoke(REQUEST);

    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.code).toBe(RouterErrorCode.UNKNOWN);
    }
  });

  it('builds all three adapters with their own provider tag', () => {
    const adapters = buildRoutingLabProviderAdapters(ROUTING_LAB_DEFAULT_SNAPSHOT, {});
    expect(adapters.gemini.provider).toBe(RouterProvider.GEMINI);
    expect(adapters.ollamaCloud.provider).toBe(RouterProvider.OLLAMA_CLOUD);
    expect(adapters.legacyLocal.provider).toBe(RouterProvider.OLLAMA);
  });
});
