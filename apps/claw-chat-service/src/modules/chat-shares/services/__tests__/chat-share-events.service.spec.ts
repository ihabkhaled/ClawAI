import { type RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';

import { ChatShareEventsService } from '../chat-share-events.service';
import { ChatShareSafetyStatus, ChatShareVisibility } from '../../../../generated/prisma';

// Bound to a variable rather than written as a literal argument. `eslint --fix`
// (unicorn/no-useless-undefined) rewrites `mockResolvedValue(undefined)` into
// `mockResolvedValue()`, which does not typecheck — the parameter is required.
// A variable is immune to that rewrite. Same trap as in
// apps/claw-payment-service/.../gateway-readiness.utility.spec.ts.
const RESOLVED_VOID: undefined = undefined;

const IDENTITY = { shareId: 'share-1', threadId: 'thread-1', userId: 'user-1' };

const STATE = {
  visibility: ChatShareVisibility.PUBLIC_INDEXED,
  safetyStatus: ChatShareSafetyStatus.APPROVED,
  messageCount: 6,
  snapshotVersion: 2,
  adsEligible: true,
};

describe('ChatShareEventsService', () => {
  let rabbit: { publish: jest.Mock };
  let service: ChatShareEventsService;

  beforeEach(() => {
    rabbit = { publish: jest.fn().mockResolvedValue(RESOLVED_VOID) };
    service = new ChatShareEventsService(rabbit as unknown as RabbitMQService);
  });

  function payloadOf(call: number): Record<string, unknown> {
    return rabbit.publish.mock.calls[call]?.[1] as Record<string, unknown>;
  }

  it('publishes each lifecycle event under its own pattern', () => {
    service.published(IDENTITY, STATE);
    service.updated(IDENTITY, STATE);
    service.visibilityChanged(IDENTITY, {
      previousVisibility: ChatShareVisibility.PUBLIC_UNLISTED,
      visibility: ChatShareVisibility.PUBLIC_INDEXED,
    });
    service.revoked(IDENTITY, ChatShareVisibility.PUBLIC_INDEXED);
    service.urlRegenerated(IDENTITY, ChatShareVisibility.PUBLIC_UNLISTED);
    service.safetyRejected(IDENTITY, ['POSSIBLE_SECRET'], ChatShareSafetyStatus.REQUIRES_REVIEW);

    expect(rabbit.publish.mock.calls.map((call) => call[0])).toEqual([
      EventPattern.CHAT_SHARE_PUBLISHED,
      EventPattern.CHAT_SHARE_UPDATED,
      EventPattern.CHAT_SHARE_VISIBILITY_CHANGED,
      EventPattern.CHAT_SHARE_REVOKED,
      EventPattern.CHAT_SHARE_URL_REGENERATED,
      EventPattern.CHAT_SHARE_SAFETY_REJECTED,
    ]);
  });

  it('stamps every payload with an ISO timestamp', () => {
    service.published(IDENTITY, STATE);

    expect(payloadOf(0)['timestamp']).toMatch(/^\d{4}-\d{2}-\d{2}T/u);
  });

  it('never carries the public identifier', () => {
    // The identifier is the only thing standing between a stranger and the
    // conversation. A durable bus message is the wrong place for it.
    service.published(IDENTITY, STATE);
    service.urlRegenerated(IDENTITY, ChatShareVisibility.PUBLIC_UNLISTED);

    for (const call of rabbit.publish.mock.calls) {
      expect(Object.keys(call[1] as Record<string, unknown>)).not.toContain('publicShareId');
    }
  });

  it('never carries conversation content, a title, or a description', () => {
    service.published(IDENTITY, STATE);

    const keys = Object.keys(payloadOf(0));
    expect(keys).not.toContain('content');
    expect(keys).not.toContain('messages');
    expect(keys).not.toContain('title');
    expect(keys).not.toContain('description');
  });

  it('swallows a bus failure rather than failing a committed publication', async () => {
    // The database write already happened and the owner was told it worked.
    // Losing one audit row is strictly better than reporting a false failure.
    rabbit.publish.mockRejectedValue(new Error('broker unreachable'));

    expect(() => service.published(IDENTITY, STATE)).not.toThrow();
    await Promise.resolve();
  });
});
