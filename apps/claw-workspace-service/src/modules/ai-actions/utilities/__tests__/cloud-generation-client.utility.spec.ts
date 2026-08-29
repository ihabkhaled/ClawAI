import { PaygSurface } from '@claw/shared-types';

import { callCloudGenerate } from '../cloud-generation-client.utility';

global.fetch = jest.fn();

const fetchMock = (): jest.Mock => global.fetch as jest.Mock;

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

  it('surfaces a 402 from chat-service as a thrown upstream failure', async () => {
    fetchMock().mockResolvedValue(
      errorResponse(402, '{"errorCode":"PAYG_CREDIT_EXHAUSTED","availableMicroUsd":0}'),
    );

    await expect(callCloudGenerate(input())).rejects.toThrow(
      /Cloud generation failed \(HTTP 402\)/,
    );
  });
});
