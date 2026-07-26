import { type RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';

import { ChatShareAuditConsumer } from '../chat-share.consumer';
import { type AuditsService } from '../../services/audits.service';

// Bound to a variable rather than written as a literal argument. `eslint --fix`
// (unicorn/no-useless-undefined) rewrites `mockResolvedValue(undefined)` into
// `mockResolvedValue()`, which does not typecheck — the parameter is required.
const RESOLVED_VOID: undefined = undefined;

const BASE = {
  shareId: 'share-1',
  threadId: 'thread-1',
  userId: 'user-1',
  timestamp: '2026-07-26T10:00:00.000Z',
};

describe('ChatShareAuditConsumer', () => {
  let rabbitmq: { subscribe: jest.Mock };
  let audits: { createAuditLog: jest.Mock };
  let consumer: ChatShareAuditConsumer;
  let handlers: Map<string, (raw: unknown) => Promise<void>>;

  beforeEach(async () => {
    handlers = new Map();
    rabbitmq = {
      subscribe: jest.fn().mockImplementation((pattern: string, handler) => {
        handlers.set(pattern, handler as (raw: unknown) => Promise<void>);
        return Promise.resolve();
      }),
    };
    audits = { createAuditLog: jest.fn().mockResolvedValue(RESOLVED_VOID) };
    consumer = new ChatShareAuditConsumer(
      rabbitmq as unknown as RabbitMQService,
      audits as unknown as AuditsService,
    );
    await consumer.onModuleInit();
  });

  function row(): Record<string, unknown> {
    return audits.createAuditLog.mock.calls[0]?.[0] as Record<string, unknown>;
  }

  it('subscribes to all six chat-share patterns', () => {
    expect([...handlers.keys()]).toEqual([
      EventPattern.CHAT_SHARE_PUBLISHED,
      EventPattern.CHAT_SHARE_UPDATED,
      EventPattern.CHAT_SHARE_VISIBILITY_CHANGED,
      EventPattern.CHAT_SHARE_REVOKED,
      EventPattern.CHAT_SHARE_URL_REGENERATED,
      EventPattern.CHAT_SHARE_SAFETY_REJECTED,
    ]);
  });

  it('files a publish under the owner, not "system"', async () => {
    // A shared chat has a responsible human. Filing it under `system` would
    // make the audit trail useless for the case it exists to serve.
    await handlers.get(EventPattern.CHAT_SHARE_PUBLISHED)?.({
      ...BASE,
      visibility: 'PUBLIC_INDEXED',
      safetyStatus: 'APPROVED',
      messageCount: 8,
      snapshotVersion: 1,
      adsEligible: true,
    });

    expect(row()).toMatchObject({
      userId: 'user-1',
      action: 'CHAT_SHARE_PUBLISHED',
      entityType: 'chat_share',
      entityId: 'share-1',
      severity: 'MEDIUM',
    });
  });

  it('records URL regeneration at HIGH severity', async () => {
    // Regeneration is what an owner does when a link has leaked. That is the
    // start of an incident timeline, not routine housekeeping.
    await handlers.get(EventPattern.CHAT_SHARE_URL_REGENERATED)?.({
      ...BASE,
      visibility: 'PUBLIC_UNLISTED',
    });

    expect(row()['severity']).toBe('HIGH');
  });

  it('records a safety rejection with its reason codes at HIGH severity', async () => {
    await handlers.get(EventPattern.CHAT_SHARE_SAFETY_REJECTED)?.({
      ...BASE,
      reasons: ['POSSIBLE_SECRET'],
      safetyStatus: 'REQUIRES_REVIEW',
    });

    expect(row()).toMatchObject({ severity: 'HIGH' });
    expect((row()['details'] as Record<string, unknown>)['reasons']).toEqual(['POSSIBLE_SECRET']);
  });

  it('keeps the visibility transition on the revoke row', async () => {
    await handlers.get(EventPattern.CHAT_SHARE_REVOKED)?.({
      ...BASE,
      previousVisibility: 'PUBLIC_INDEXED',
    });

    expect((row()['details'] as Record<string, unknown>)['previousVisibility']).toBe(
      'PUBLIC_INDEXED',
    );
  });

  it('does not rethrow when the audit write fails', async () => {
    // chat-service already committed the state change; DLQ-ing the message
    // would not undo the publication, it would just lose the record.
    audits.createAuditLog.mockRejectedValue(new Error('mongo down'));

    await expect(
      handlers.get(EventPattern.CHAT_SHARE_REVOKED)?.({
        ...BASE,
        previousVisibility: 'PUBLIC_UNLISTED',
      }),
    ).resolves.toBeUndefined();
  });
});
