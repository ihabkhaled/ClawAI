import { type Mock, vi } from 'vitest';
import type { RabbitMQService } from '@claw/shared-rabbitmq';

import type { ImplHandoffRepository } from '../repositories/impl-handoff.repository';
import { ImplHandoffManager } from '../managers/impl-handoff.manager';

const { guardedFetch } = vi.hoisted(() => ({ guardedFetch: vi.fn() }));

vi.mock('../../../common/utilities/guarded-fetch.utility', () => ({ guardedFetch }));

vi.mock('../../../app/config/app.config', () => ({
  AppConfig: {
    get: vi.fn(() => ({
      CHAT_SERVICE_URL: 'http://chat-service:4002',
      AGENT_SERVICE_URL: 'http://agent-service:4015',
      INTER_SERVICE_AUTH_TOKEN: 'service-secret-token-0000000000',
    })),
  },
}));

const ROW = {
  id: 'handoff-1',
  sourceQueueId: 'queue-1',
  userId: 'user-1',
  mode: 'CHAT',
  targetThreadId: null,
  targetTerminalCommandId: null,
  status: 'DELIVERED',
  errorMessage: null,
  briefSnippet: 'brief',
  createdAt: new Date('2026-11-27T00:00:00.000Z'),
  deliveredAt: null,
};

function jsonResponse(body: unknown): {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
} {
  return { ok: true, status: 201, json: () => Promise.resolve(body) };
}

function manager(): ImplHandoffManager {
  const repo = {
    create: vi.fn().mockResolvedValue(ROW),
    markDelivered: vi.fn().mockResolvedValue(ROW),
    markFailed: vi.fn().mockResolvedValue(ROW),
  } as unknown as ImplHandoffRepository;
  const rabbitmq = { publish: vi.fn().mockResolvedValue(undefined) } as unknown as RabbitMQService;
  return new ImplHandoffManager(repo, rabbitmq);
}

function sentHeaders(): Record<string, string> {
  const init = (guardedFetch as Mock).mock.calls[0]?.[2] as { headers: Record<string, string> };
  return init.headers;
}

/**
 * Both handoff targets are internal routes that require the service token
 * (security audit 2026-11-27). A handoff without it would 401 and be recorded
 * as FAILED for every user.
 */
describe('ImplHandoffManager service-to-service calls', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('sends the service token when seeding a chat thread', async () => {
    guardedFetch.mockResolvedValue(jsonResponse({ threadId: 'thread-1' }));

    await manager().handoff({
      sourceQueueId: 'queue-1',
      userId: 'user-1',
      mode: 'CHAT',
      brief: 'Implement the export button.',
    });

    expect(guardedFetch).toHaveBeenCalledWith(
      'http://chat-service:4002',
      'http://chat-service:4002/api/v1/internal/chat/threads/seeded',
      expect.anything(),
    );
    expect(sentHeaders().Authorization).toBe('Service service-secret-token-0000000000');
  });

  it('sends the service token when seeding an agent terminal command', async () => {
    guardedFetch.mockResolvedValue(jsonResponse({ terminalCommandId: 'cmd-1' }));

    await manager().handoff({
      sourceQueueId: 'queue-1',
      userId: 'user-1',
      mode: 'AGENT',
      brief: 'Implement the export button.',
    });

    expect(guardedFetch).toHaveBeenCalledWith(
      'http://agent-service:4015',
      'http://agent-service:4015/api/v1/internal/agent/terminal/seed-command',
      expect.anything(),
    );
    expect(sentHeaders().Authorization).toBe('Service service-secret-token-0000000000');
  });
});
