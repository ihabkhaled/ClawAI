import {
  explorerLeaderboardQuerySchema,
  explorerUsersQuerySchema,
} from '../admin-usage-explorer.dto';

describe('explorer query schemas', () => {
  it('applies defaults', () => {
    const parsed = explorerUsersQuerySchema.parse({});
    expect(parsed.limit).toBe(25);
    expect(parsed.order).toBe('desc');
    expect(parsed.sort).toBe('lastSeen');
  });

  it('folds days into hours', () => {
    expect(explorerUsersQuerySchema.parse({ days: '30' })).toMatchObject({ hours: 720 });
  });

  it('rejects a preset combined with from/to, an oversized limit and a bad billing value', () => {
    expect(
      explorerUsersQuerySchema.safeParse({ days: 3, from: '2026-10-01T00:00:00Z' }).success,
    ).toBe(false);
    expect(explorerUsersQuerySchema.safeParse({ days: 3, hours: 5 }).success).toBe(false);
    expect(explorerUsersQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
    expect(explorerUsersQuerySchema.safeParse({ billing: 'FREE' }).success).toBe(false);
    expect(explorerUsersQuerySchema.safeParse({ days: 91 }).success).toBe(false);
  });

  it('accepts the four leaderboard dimensions only', () => {
    expect(explorerLeaderboardQuerySchema.parse({ dimension: 'user' }).dimension).toBe('user');
    expect(explorerLeaderboardQuerySchema.safeParse({ dimension: 'password' }).success).toBe(false);
  });
});
