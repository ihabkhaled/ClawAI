import { UserNotificationKind } from '../user-notification-kind.enum';

describe('UserNotificationKind: MCP server decisions', () => {
  it('adds the approved and rejected kinds with values equal to their names', () => {
    expect(UserNotificationKind.MCP_SERVER_APPROVED).toBe('MCP_SERVER_APPROVED');
    expect(UserNotificationKind.MCP_SERVER_REJECTED).toBe('MCP_SERVER_REJECTED');
  });

  it('keeps every kind value unique', () => {
    const values = Object.values(UserNotificationKind);
    expect(new Set(values).size).toBe(values.length);
  });
});
