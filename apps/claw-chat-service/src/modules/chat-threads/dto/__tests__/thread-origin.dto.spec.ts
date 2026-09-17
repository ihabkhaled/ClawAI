import { createThreadSchema } from '../create-thread.dto';
import { listThreadsQuerySchema } from '../list-threads-query.dto';
import { ThreadOrigin } from '../../../../generated/prisma';

describe('thread origin', () => {
  it('creates a web thread when no origin is given', () => {
    // Every existing caller omits it, and none of them should start creating
    // coding agent threads by accident.
    const result = createThreadSchema.safeParse({ title: 'Hello' });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.origin).toBeUndefined();
  });

  it('accepts a coding agent origin from a caller that asks for one', () => {
    const result = createThreadSchema.safeParse({ origin: ThreadOrigin.CODING_AGENT });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.origin).toBe(ThreadOrigin.CODING_AGENT);
  });

  it('rejects an origin that is not one of the two', () => {
    expect(createThreadSchema.safeParse({ origin: 'CLI' }).success).toBe(false);
  });

  it('lists web threads when the query says nothing about origin', () => {
    // This single default is what removes the agent's runs from the web chat
    // list without the frontend being changed at all.
    const result = listThreadsQuerySchema.safeParse({});

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.origin).toBe(ThreadOrigin.WEB);
  });

  it('lists coding agent threads when the query asks for them', () => {
    const result = listThreadsQuerySchema.safeParse({ origin: ThreadOrigin.CODING_AGENT });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.origin).toBe(ThreadOrigin.CODING_AGENT);
  });
});
