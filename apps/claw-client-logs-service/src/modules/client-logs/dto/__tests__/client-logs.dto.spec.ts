import { createClientLogSchema } from '../create-client-log.dto';
import { searchClientLogsSchema } from '../search-client-logs.dto';
import { SortOrder } from '../../../../common/enums/sort-order.enum';

describe('createClientLogSchema (DTO fuzz)', () => {
  it('accepts the minimal valid payload', () => {
    expect(createClientLogSchema.parse({ level: 'info', message: 'hello' })).toMatchObject({
      level: 'info',
      message: 'hello',
    });
  });

  it('rejects empty level', () => {
    expect(createClientLogSchema.safeParse({ level: '', message: 'x' }).success).toBe(false);
  });

  it('rejects level over 10 chars', () => {
    expect(createClientLogSchema.safeParse({ level: 'a'.repeat(11), message: 'x' }).success).toBe(
      false,
    );
  });

  it('rejects empty message', () => {
    expect(createClientLogSchema.safeParse({ level: 'info', message: '' }).success).toBe(false);
  });

  it('rejects message over 5000 chars', () => {
    expect(
      createClientLogSchema.safeParse({ level: 'info', message: 'a'.repeat(5001) }).success,
    ).toBe(false);
  });

  it('rejects errorStack over 10000 chars', () => {
    expect(
      createClientLogSchema.safeParse({
        level: 'error',
        message: 'x',
        errorStack: 'x'.repeat(10_001),
      }).success,
    ).toBe(false);
  });

  it('accepts optional metadata as a record', () => {
    const result = createClientLogSchema.parse({
      level: 'info',
      message: 'x',
      metadata: { foo: 'bar', count: 1, nested: { a: true } },
    });
    expect(result.metadata).toEqual({ foo: 'bar', count: 1, nested: { a: true } });
  });

  it('rejects when level is missing', () => {
    expect(createClientLogSchema.safeParse({ message: 'x' }).success).toBe(false);
  });

  it('rejects when message is missing', () => {
    expect(createClientLogSchema.safeParse({ level: 'info' }).success).toBe(false);
  });
});

describe('searchClientLogsSchema (DTO fuzz)', () => {
  it('applies defaults when no fields are provided', () => {
    const result = searchClientLogsSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.sortBy).toBe('createdAt');
    expect(result.sortOrder).toBe(SortOrder.DESC);
  });

  it('coerces numeric strings into numbers for page/limit', () => {
    const result = searchClientLogsSchema.parse({ page: '3', limit: '50' });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(50);
  });

  it('rejects page < 1', () => {
    expect(searchClientLogsSchema.safeParse({ page: 0 }).success).toBe(false);
  });

  it('rejects limit > 100', () => {
    expect(searchClientLogsSchema.safeParse({ limit: 101 }).success).toBe(false);
  });

  it('accepts only ASC and DESC for sortOrder', () => {
    expect(searchClientLogsSchema.safeParse({ sortOrder: 'asc' }).success).toBe(true);
    expect(searchClientLogsSchema.safeParse({ sortOrder: 'desc' }).success).toBe(true);
    expect(searchClientLogsSchema.safeParse({ sortOrder: 'sideways' }).success).toBe(false);
  });

  it('accepts only createdAt / level / component for sortBy', () => {
    expect(searchClientLogsSchema.safeParse({ sortBy: 'createdAt' }).success).toBe(true);
    expect(searchClientLogsSchema.safeParse({ sortBy: 'level' }).success).toBe(true);
    expect(searchClientLogsSchema.safeParse({ sortBy: 'component' }).success).toBe(true);
    expect(searchClientLogsSchema.safeParse({ sortBy: 'unknown' }).success).toBe(false);
  });

  it('rejects search > 500 chars', () => {
    expect(searchClientLogsSchema.safeParse({ search: 'a'.repeat(501) }).success).toBe(false);
  });

  it('rejects messageContains > 500 chars', () => {
    expect(searchClientLogsSchema.safeParse({ messageContains: 'a'.repeat(501) }).success).toBe(
      false,
    );
  });
});
