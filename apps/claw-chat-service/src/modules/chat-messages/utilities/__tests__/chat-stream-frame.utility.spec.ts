import { parseEventSequence, parseStreamFrame } from '../chat-stream-frame.utility';

describe('parseStreamFrame', () => {
  it('decodes a well-formed frame', () => {
    expect(parseStreamFrame('{"threadId":"t1","type":"DONE"}')).toEqual({
      threadId: 't1',
      type: 'DONE',
    });
  });

  it('returns null rather than throwing on a corrupt frame', () => {
    // Runs inside the Redis subscriber callback; an exception there takes
    // down the subscription for the whole replica.
    expect(parseStreamFrame('not json')).toBeNull();
  });
});

describe('parseEventSequence', () => {
  // The wire format is `"<threadId>:<sequence>"`. Thread ids are cuids
  // constrained to exclude `:`, so splitting on the LAST colon is unambiguous.
  it('reads the sequence out of a well-formed event id', () => {
    expect(parseEventSequence('cmabc123:42')).toBe(42);
  });

  it('reads sequence 0 correctly, not as falsy-missing', () => {
    expect(parseEventSequence('cmabc123:0')).toBe(0);
  });

  it('returns undefined for a missing id, so callers replay everything', () => {
    expect(parseEventSequence(undefined)).toBeUndefined();
  });

  it('returns undefined for an id with no colon', () => {
    expect(parseEventSequence('not-one-of-ours')).toBeUndefined();
  });

  it('returns undefined for a non-numeric tail', () => {
    // A stale id from a different format, or a client sending garbage. Falling
    // back to "replay everything" is the safe default, not a crash.
    expect(parseEventSequence('cmabc123:not-a-number')).toBeUndefined();
  });

  it('returns undefined for a negative-looking tail', () => {
    expect(parseEventSequence('cmabc123:-5')).toBeUndefined();
  });
});
