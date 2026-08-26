import { FEEDBACK_TICKET_NUMBER_PAD, FEEDBACK_TICKET_PREFIX } from '@claw/shared-constants';

import { FeedbackRepository } from '../feedback.repository';

// The repository is the only place a query is built, so the ownership filter
// and the ticket-number lookup are asserted on the query object itself rather
// than on whatever a service happened to return.

function models(): {
  ticketModel: Record<string, jest.Mock>;
  counterModel: Record<string, jest.Mock>;
  lastFilter: () => unknown;
} {
  const captured: unknown[] = [];
  const chain = {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
  };
  const ticketModel = {
    find: jest.fn((filter: unknown) => {
      captured.push(filter);
      return chain;
    }),
    countDocuments: jest.fn(() => ({ exec: jest.fn().mockResolvedValue(0) })),
    findById: jest.fn(() => ({ exec: jest.fn().mockResolvedValue(null) })),
    findOne: jest.fn(() => ({ exec: jest.fn().mockResolvedValue(null) })),
    aggregate: jest.fn(() => ({ exec: jest.fn().mockResolvedValue([]) })),
    findByIdAndUpdate: jest.fn(() => ({ exec: jest.fn().mockResolvedValue(null) })),
  };
  const counterModel = {
    findOneAndUpdate: jest.fn(() => ({ exec: jest.fn().mockResolvedValue({ seq: 42 }) })),
  };
  return { ticketModel, counterModel, lastFilter: () => captured.at(-1) };
}

function repository(): { repo: FeedbackRepository; lastFilter: () => unknown } {
  const { ticketModel, counterModel, lastFilter } = models();
  const repo = new FeedbackRepository(ticketModel as never, counterModel as never);
  return { repo, lastFilter };
}

const base = { page: 1, limit: 20 };

describe('ticket numbers', () => {
  it('formats the counter value with the shared prefix and padding', async () => {
    const { repo } = repository();

    await expect(repo.nextTicketNumber()).resolves.toBe(
      `${FEEDBACK_TICKET_PREFIX}-${'42'.padStart(FEEDBACK_TICKET_NUMBER_PAD, '0')}`,
    );
  });

  it('allocates atomically with $inc and upsert, never a read-then-write', async () => {
    const { ticketModel, counterModel } = models();
    const repo = new FeedbackRepository(ticketModel as never, counterModel as never);

    await repo.nextTicketNumber();

    expect(counterModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'feedback' },
      { $inc: { seq: 1 } },
      expect.objectContaining({ upsert: true }),
    );
  });
});

describe('findPaginated builds a safe query', () => {
  it('puts userId in the filter so a list cannot leak another tenant', async () => {
    const { repo, lastFilter } = repository();

    await repo.findPaginated({ ...base, userId: 'user-a' });

    expect(lastFilter()).toMatchObject({ userId: 'user-a' });
  });

  it('omits userId entirely for the admin list', async () => {
    const { repo, lastFilter } = repository();

    await repo.findPaginated({ ...base });

    expect(lastFilter()).not.toHaveProperty('userId');
  });

  it('looks a ticket number up exactly instead of through the text index', async () => {
    const { repo, lastFilter } = repository();

    await repo.findPaginated({ ...base, search: 'FDB-000003' });

    // Mongo tokenises the hyphen, so a $text search for FDB-000003 matched
    // every ticket. Exact match is the only correct reading of that input.
    expect(lastFilter()).toMatchObject({ ticketNumber: 'FDB-000003' });
    expect(lastFilter()).not.toHaveProperty('$text');
  });

  it('accepts a lowercase ticket number', async () => {
    const { repo, lastFilter } = repository();

    await repo.findPaginated({ ...base, search: 'fdb-000003' });

    expect(lastFilter()).toMatchObject({ ticketNumber: 'FDB-000003' });
  });

  it('falls back to full-text search for anything else', async () => {
    const { repo, lastFilter } = repository();

    await repo.findPaginated({ ...base, search: 'sidebar truncates' });

    expect(lastFilter()).toMatchObject({ $text: { $search: 'sidebar truncates' } });
  });

  it('combines owner, status and type filters', async () => {
    const { repo, lastFilter } = repository();

    await repo.findPaginated({ ...base, userId: 'user-a', status: 'OPEN', type: 'BUG_REPORT' });

    expect(lastFilter()).toMatchObject({
      userId: 'user-a',
      status: 'OPEN',
      type: 'BUG_REPORT',
    });
  });
});

describe('findByIdForUser', () => {
  it('scopes by owner inside the query', async () => {
    const { ticketModel, counterModel } = models();
    const repo = new FeedbackRepository(ticketModel as never, counterModel as never);

    await repo.findByIdForUser('ticket-1', 'user-a');

    expect(ticketModel.findOne).toHaveBeenCalledWith({ _id: 'ticket-1', userId: 'user-a' });
  });
});
