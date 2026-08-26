import { FeedbackTicketSchema } from '../feedback-ticket.schema';

// A ticket is serialised as the API contract, not as a Mongo document. The
// responses used to carry `_id`, `__v` and the internal `searchText` blob, and
// never carried `id` — so the admin table had no stable React key and a row
// click passed undefined to the detail dialog.
describe('feedback ticket serialisation', () => {
  function serialise(record: Record<string, unknown>): Record<string, unknown> {
    const options = FeedbackTicketSchema.get('toJSON') as {
      transform: (document: unknown, returned: Record<string, unknown>) => Record<string, unknown>;
    };
    return options.transform({}, { ...record });
  }

  it('exposes id and hides the raw Mongo identifier', () => {
    const output = serialise({ _id: 'abc123', ticketNumber: 'FDB-000001' });

    expect(output.id).toBe('abc123');
    expect(output).not.toHaveProperty('_id');
  });

  it('never leaks the internal search blob', () => {
    const output = serialise({ _id: 'abc123', searchText: 'lowercased body text' });

    expect(output).not.toHaveProperty('searchText');
  });

  it('drops the version key', () => {
    const options = FeedbackTicketSchema.get('toJSON') as { versionKey: boolean };

    expect(options.versionKey).toBe(false);
  });

  it('keeps the fields the client actually needs', () => {
    const output = serialise({
      _id: 'abc123',
      ticketNumber: 'FDB-000001',
      title: 'Something broke',
      status: 'OPEN',
    });

    expect(output).toMatchObject({
      ticketNumber: 'FDB-000001',
      title: 'Something broke',
      status: 'OPEN',
    });
  });
});
