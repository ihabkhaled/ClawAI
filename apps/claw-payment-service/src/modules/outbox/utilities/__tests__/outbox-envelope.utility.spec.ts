import { addOutboxEventId } from '../outbox-envelope.utility';

describe('addOutboxEventId', () => {
  it('adds the durable outbox id to an event envelope', () => {
    expect(addOutboxEventId({ userId: 'user-1' }, 'event-1')).toEqual({
      userId: 'user-1',
      eventId: 'event-1',
    });
  });

  it('makes the durable row authoritative over a conflicting payload id', () => {
    expect(addOutboxEventId({ eventId: 'forged' }, 'event-1')).toEqual({
      eventId: 'event-1',
    });
  });

  it('wraps a legacy non-object payload without losing it', () => {
    expect(addOutboxEventId('legacy', 'event-1')).toEqual({
      eventId: 'event-1',
      data: 'legacy',
    });
  });
});
