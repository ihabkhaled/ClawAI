import { createServerLogSchema } from '../create-server-log.dto';
import { batchCreateServerLogsSchema } from '../batch-create-server-logs.dto';
import { listServerLogsQuerySchema } from '../list-server-logs-query.dto';
import { SortOrder } from '../../../../common/enums/sort-order.enum';

describe('createServerLogSchema (DTO fuzz)', () => {
  it('accepts the minimal valid payload', () => {
    const result = createServerLogSchema.parse({
      level: 'info',
      message: 'hello',
      serviceName: 'auth',
    });
    expect(result.level).toBe('info');
  });

  it('rejects when level is missing', () => {
    expect(createServerLogSchema.safeParse({ message: 'x', serviceName: 's' }).success).toBe(false);
  });

  it('rejects when serviceName is missing', () => {
    expect(createServerLogSchema.safeParse({ level: 'info', message: 'x' }).success).toBe(false);
  });

  it('rejects message over the maximum length', () => {
    const result = createServerLogSchema.safeParse({
      level: 'info',
      message: 'a'.repeat(20_000),
      serviceName: 's',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a metadata record', () => {
    const result = createServerLogSchema.parse({
      level: 'info',
      message: 'm',
      serviceName: 's',
      metadata: { foo: 'bar', count: 1 },
    });
    expect(result.metadata).toEqual({ foo: 'bar', count: 1 });
  });
});

describe('batchCreateServerLogsSchema (DTO fuzz)', () => {
  it('accepts an array of valid entries', () => {
    const result = batchCreateServerLogsSchema.parse({
      entries: [
        { level: 'info', message: 'a', serviceName: 's1' },
        { level: 'warn', message: 'b', serviceName: 's2' },
      ],
    });
    expect(result.entries).toHaveLength(2);
  });

  it('rejects empty entries array', () => {
    const result = batchCreateServerLogsSchema.safeParse({ entries: [] });
    expect(result.success).toBe(false);
  });

  it('rejects when an entry is missing required fields', () => {
    const result = batchCreateServerLogsSchema.safeParse({
      entries: [{ level: 'info', message: 'a' }],
    });
    expect(result.success).toBe(false);
  });
});

describe('listServerLogsQuerySchema (DTO fuzz)', () => {
  it('applies defaults when no fields are provided', () => {
    const result = listServerLogsQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.sortBy).toBe('createdAt');
    expect(result.sortOrder).toBe(SortOrder.DESC);
  });

  it('coerces numeric strings to numbers', () => {
    const result = listServerLogsQuerySchema.parse({ page: '5', limit: '50' });
    expect(result.page).toBe(5);
    expect(result.limit).toBe(50);
  });

  it('rejects status code out of HTTP range', () => {
    expect(listServerLogsQuerySchema.safeParse({ statusCode: 99 }).success).toBe(false);
    expect(listServerLogsQuerySchema.safeParse({ statusCode: 600 }).success).toBe(false);
  });

  it('accepts only known sortBy values', () => {
    expect(listServerLogsQuerySchema.safeParse({ sortBy: 'createdAt' }).success).toBe(true);
    expect(listServerLogsQuerySchema.safeParse({ sortBy: 'latencyMs' }).success).toBe(true);
    expect(listServerLogsQuerySchema.safeParse({ sortBy: 'level' }).success).toBe(true);
    expect(listServerLogsQuerySchema.safeParse({ sortBy: 'serviceName' }).success).toBe(true);
    expect(listServerLogsQuerySchema.safeParse({ sortBy: 'unknown' }).success).toBe(false);
  });

  it('accepts only ASC and DESC for sortOrder', () => {
    expect(listServerLogsQuerySchema.safeParse({ sortOrder: 'asc' }).success).toBe(true);
    expect(listServerLogsQuerySchema.safeParse({ sortOrder: 'desc' }).success).toBe(true);
    expect(listServerLogsQuerySchema.safeParse({ sortOrder: 'sideways' }).success).toBe(false);
  });

  it('rejects negative latency bounds', () => {
    expect(listServerLogsQuerySchema.safeParse({ latencyMin: -1 }).success).toBe(false);
  });

  it('rejects interval > 1440 minutes', () => {
    expect(listServerLogsQuerySchema.safeParse({ interval: 1441 }).success).toBe(false);
  });
});
