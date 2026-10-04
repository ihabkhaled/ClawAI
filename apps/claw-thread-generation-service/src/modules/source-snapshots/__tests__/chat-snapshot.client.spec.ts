import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppConfig } from '../../../app/config/app.config';
import { ChatSnapshotClient } from '../chat-snapshot.client';

describe('ChatSnapshotClient', () => {
  const validSnapshot = () => {
    const body = {
      schemaVersion: 1,
      sourceThreadId: 'thread-1',
      title: null,
      sourceCreatedAt: '2026-10-01T10:00:00.000Z',
      messageCount: 0,
      messages: [],
    };
    const byteCount = Buffer.byteLength(JSON.stringify(body), 'utf8');
    return {
      ...body,
      byteCount,
      sha256: createHash('sha256')
        .update(JSON.stringify({ ...body, byteCount }))
        .digest('hex'),
    };
  };

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('sends service auth, owner identity, and rejects mismatched source ids', async () => {
    vi.stubEnv('JWT_SECRET', 'j'.repeat(40));
    vi.stubEnv('INTER_SERVICE_AUTH_TOKEN', 't'.repeat(40));
    vi.stubEnv('CHAT_SERVICE_URL', 'https://chat.internal');
    AppConfig.validate();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(validSnapshot()), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await new ChatSnapshotClient().getOwnedSnapshot('owner-1', 'thread-1');
    const [url, init] = fetchMock.mock.calls[0] ?? [];

    expect(url).toBe('https://chat.internal/api/v1/internal/thread-snapshots/thread-1');
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: `Service ${'t'.repeat(40)}`,
    });
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({ userId: 'owner-1' });
    expect(result.sourceThreadId).toBe('thread-1');
  });

  it('rejects a snapshot with a bad digest or byte count', async () => {
    vi.stubEnv('JWT_SECRET', 'j'.repeat(40));
    vi.stubEnv('INTER_SERVICE_AUTH_TOKEN', 't'.repeat(40));
    AppConfig.validate();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ...validSnapshot(), sha256: 'b'.repeat(64) }), {
          status: 200,
        }),
      ),
    );

    await expect(new ChatSnapshotClient().getOwnedSnapshot('owner-1', 'thread-1')).rejects.toThrow(
      'integrity check failed',
    );
  });

  it('rejects a snapshot whose declared message count does not match its content', async () => {
    vi.stubEnv('JWT_SECRET', 'j'.repeat(40));
    vi.stubEnv('INTER_SERVICE_AUTH_TOKEN', 't'.repeat(40));
    AppConfig.validate();
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ ...validSnapshot(), messageCount: 1 }), { status: 200 }),
        ),
    );

    await expect(new ChatSnapshotClient().getOwnedSnapshot('owner-1', 'thread-1')).rejects.toThrow(
      'response is invalid',
    );
  });
});
