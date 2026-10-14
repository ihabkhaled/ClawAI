import { type Mock, vi } from 'vitest';
import { PaygSurface } from '@claw/shared-types';

import { AppConfig } from '../../../../app/config/app.config';
import { callCloudGenerate } from '../cloud-generation-client.utility';

global.fetch = vi.fn();

const fetchMock = (): Mock => global.fetch as Mock;

const okResponse = (
  body: unknown,
): { ok: boolean; status: number; text: () => Promise<string> } => ({
  ok: true,
  status: 200,
  text: () => Promise.resolve(JSON.stringify(body)),
});

const errorResponse = (
  status: number,
  body: string,
): { ok: boolean; status: number; text: () => Promise<string> } => ({
  ok: false,
  status,
  text: () => Promise.resolve(body),
});

const input = (): Parameters<typeof callCloudGenerate>[0] => ({
  chatServiceUrl: 'http://chat-service:4002',
  provider: 'ANTHROPIC',
  model: 'claude-sonnet-4',
  systemPrompt: 'be terse',
  userPrompt: 'summarise this',
  timeoutMs: 5_000,
  userId: 'user-7',
  surface: PaygSurface.WORKSPACE_ACTION,
});

const sentBody = (): Record<string, unknown> => {
  const call = fetchMock().mock.calls[0] as [string, { body: string }];
  return JSON.parse(call[1].body) as Record<string, unknown>;
};

describe('callCloudGenerate — PAYG attribution (U8/U9/U10)', () => {
  beforeEach(() => {
    fetchMock().mockReset();
    vi.spyOn(AppConfig, 'get').mockReturnValue({
      INTER_SERVICE_AUTH_TOKEN: 'inter-service-secret',
    } as unknown as ReturnType<typeof AppConfig.get>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // chat-service guards POST /internal/chat/generate with ServiceTokenGuard.
  // Dropping this header turns every workspace cloud call into a 401.
  it('sends the inter-service token as Authorization: Service <token>', async () => {
    fetchMock().mockResolvedValue(okResponse({ content: 'done' }));

    await callCloudGenerate(input());

    const call = fetchMock().mock.calls[0] as [string, { headers: Record<string, string> }];
    expect(call[1].headers['Authorization']).toBe('Service inter-service-secret');
    expect(call[1].headers['Content-Type']).toBe('application/json');
  });

  it('surfaces a 401 from chat-service as a thrown upstream failure', async () => {
    fetchMock().mockResolvedValue(errorResponse(401, '{"message":"Unauthorized"}'));

    await expect(callCloudGenerate(input())).rejects.toThrow(
      /Cloud generation failed \(HTTP 401\)/,
    );
  });

  it('sends the acting user and the spending surface to chat-service', async () => {
    fetchMock().mockResolvedValue(okResponse({ content: 'done', inputTokens: 5, outputTokens: 9 }));

    await callCloudGenerate(input());

    expect(sentBody()).toMatchObject({
      provider: 'ANTHROPIC',
      model: 'claude-sonnet-4',
      userId: 'user-7',
      surface: PaygSurface.WORKSPACE_ACTION,
    });
  });

  it('passes the caller-supplied userId straight through, with no default', async () => {
    fetchMock().mockResolvedValue(okResponse({ content: 'done' }));

    await callCloudGenerate({ ...input(), userId: 'someone-else' });

    // No default and no fallback anywhere on this path: a defaulted id would
    // charge the wrong wallet, which is worse than a hard failure.
    expect(sentBody()['userId']).toBe('someone-else');
  });

  it('sends a fresh requestId per call and the workflow tag when given', async () => {
    fetchMock().mockResolvedValue(okResponse({ content: 'done' }));

    await callCloudGenerate({ ...input(), workflow: 'workspace-ai-action' });
    await callCloudGenerate(input());

    const bodies = fetchMock().mock.calls.map(
      (c) => JSON.parse((c as [string, { body: string }])[1].body) as Record<string, unknown>,
    );
    expect(bodies[0]?.['workflow']).toBe('workspace-ai-action');
    expect(bodies[1]).not.toHaveProperty('workflow');
    expect(typeof bodies[0]?.['requestId']).toBe('string');
    expect(bodies[0]?.['requestId']).not.toBe(bodies[1]?.['requestId']);
  });

  it('keeps a caller-supplied requestId', async () => {
    fetchMock().mockResolvedValue(okResponse({ content: 'done' }));

    await callCloudGenerate({ ...input(), requestId: 'req-fixed' });

    expect(sentBody()['requestId']).toBe('req-fixed');
  });

  it('surfaces a 402 from chat-service as a thrown upstream failure', async () => {
    fetchMock().mockResolvedValue(
      errorResponse(402, '{"errorCode":"PAYG_CREDIT_EXHAUSTED","availableMicroUsd":0}'),
    );

    await expect(callCloudGenerate(input())).rejects.toThrow(
      /Cloud generation failed \(HTTP 402\)/,
    );
  });

  it('keeps the upstream body out of the thrown message', async () => {
    fetchMock().mockResolvedValue(errorResponse(400, '{"message":"Provider GEMINI returned 404"}'));

    const failure = await callCloudGenerate(input()).catch((e: unknown) => e);

    expect((failure as Error).message).toBe('Cloud generation failed (HTTP 400)');
  });
});
