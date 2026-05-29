import { listAuditsQuerySchema } from '../list-audits-query.dto';
import { listUsageQuerySchema } from '../list-usage-query.dto';

describe('listAuditsQuerySchema', () => {
  it('applies defaults when no fields are provided', () => {
    const result = listAuditsQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('coerces numeric strings to numbers', () => {
    const result = listAuditsQuerySchema.parse({ page: '3', limit: '50' });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(50);
  });

  it('rejects page < 1', () => {
    expect(listAuditsQuerySchema.safeParse({ page: 0 }).success).toBe(false);
  });

  it('rejects limit > 100', () => {
    expect(listAuditsQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
  });

  it('accepts optional filter fields', () => {
    const result = listAuditsQuerySchema.parse({
      action: 'login',
      severity: 'INFO',
      entityType: 'User',
    });
    expect(result.action).toBe('login');
    expect(result.severity).toBe('INFO');
  });
});

describe('listUsageQuerySchema', () => {
  it('applies defaults', () => {
    const result = listUsageQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('rejects negative page', () => {
    expect(listUsageQuerySchema.safeParse({ page: -1 }).success).toBe(false);
  });

  it('coerces and accepts provider/model filters', () => {
    const result = listUsageQuerySchema.parse({
      page: '2',
      provider: 'openai',
      model: 'gpt-4',
    });
    expect(result.page).toBe(2);
    expect(result.provider).toBe('openai');
  });

  it('accepts date strings', () => {
    const result = listUsageQuerySchema.parse({
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    });
    expect(result.startDate).toBe('2026-01-01');
    expect(result.endDate).toBe('2026-12-31');
  });

  it('accepts an optional context filter', () => {
    const result = listUsageQuerySchema.parse({ context: 'judge' });
    expect(result.context).toBe('judge');
  });

  it('leaves context undefined when omitted', () => {
    const result = listUsageQuerySchema.parse({});
    expect(result.context).toBeUndefined();
  });

  it('rejects context longer than 100 chars', () => {
    expect(listUsageQuerySchema.safeParse({ context: 'a'.repeat(101) }).success).toBe(false);
  });
});
