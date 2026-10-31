import {
  globalChallengeSchema,
  globalClearSchema,
  globalTerminateSchema,
  listSessionsQuerySchema,
  terminateSessionSchema,
} from '../session-admin.dto';

describe('session admin DTOs', () => {
  describe('listSessionsQuerySchema', () => {
    it('defaults to page 1 of 20 and accepts a state filter', () => {
      expect(listSessionsQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 });
      expect(
        listSessionsQuerySchema.parse({ state: 'EXPIRED', page: '2', pageSize: '50' }),
      ).toEqual({
        state: 'EXPIRED',
        page: 2,
        pageSize: 50,
      });
    });

    it.each([
      { state: 'DELETED' },
      { page: '0' },
      { pageSize: '101' },
      { pageSize: '-1' },
      { extra: '1' },
    ])('rejects %j', (input) => {
      expect(listSessionsQuerySchema.safeParse(input).success).toBe(false);
    });
  });

  it('terminateSessionSchema takes only confirmCurrent', () => {
    expect(terminateSessionSchema.parse({})).toEqual({});
    expect(terminateSessionSchema.parse({ confirmCurrent: true })).toEqual({
      confirmCurrent: true,
    });
    expect(terminateSessionSchema.safeParse({ confirmCurrent: 'yes' }).success).toBe(false);
    expect(terminateSessionSchema.safeParse({ userId: 'x' }).success).toBe(false);
  });

  it('globalChallengeSchema needs a known action and a bounded password', () => {
    expect(
      globalChallengeSchema.safeParse({ action: 'TERMINATE_ALL', password: 'x' }).success,
    ).toBe(true);
    expect(
      globalChallengeSchema.safeParse({ action: 'CLEAR_ALL_LOGS', password: 'x' }).success,
    ).toBe(true);
    expect(globalChallengeSchema.safeParse({ action: 'DROP_TABLE', password: 'x' }).success).toBe(
      false,
    );
    expect(globalChallengeSchema.safeParse({ action: 'TERMINATE_ALL', password: '' }).success).toBe(
      false,
    );
    expect(
      globalChallengeSchema.safeParse({ action: 'TERMINATE_ALL', password: 'x'.repeat(1_025) })
        .success,
    ).toBe(false);
  });

  it('globalTerminateSchema keeps the acting login by default', () => {
    const parsed = globalTerminateSchema.parse({ token: 'a'.repeat(43), phrase: 'TERMINATE ALL' });
    expect(parsed.keepCurrentSession).toBe(true);
    expect(globalTerminateSchema.safeParse({ phrase: 'TERMINATE ALL' }).success).toBe(false);
    expect(globalTerminateSchema.safeParse({ token: 'short', phrase: 'x' }).success).toBe(false);
  });

  it('globalClearSchema needs a token and a phrase', () => {
    expect(
      globalClearSchema.safeParse({ token: 'a'.repeat(43), phrase: 'CLEAR ALL LOGS' }).success,
    ).toBe(true);
    expect(globalClearSchema.safeParse({ token: 'a'.repeat(43) }).success).toBe(false);
    expect(
      globalClearSchema.safeParse({ token: 'a'.repeat(43), phrase: 'x', keepCurrentSession: true })
        .success,
    ).toBe(false);
  });
});
