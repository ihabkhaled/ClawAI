import { listCodingAgentChatsQuerySchema } from '../list-coding-agent-chats-query.dto';
import { listCodingAgentMessagesQuerySchema } from '../list-coding-agent-messages-query.dto';
import { SortOrder } from '../../../../common/enums';

describe('coding agent chat query schemas', () => {
  it('defaults to the most recently updated runs', () => {
    const result = listCodingAgentChatsQuerySchema.safeParse({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
      expect(result.data.sortBy).toBe('updatedAt');
      expect(result.data.sortOrder).toBe(SortOrder.DESC);
    }
  });

  it('accepts no origin parameter, because the origin is not the caller to choose', () => {
    // The endpoint is the coding agent's own. Letting a query pick the origin
    // would make it a general thread reader wearing a different name.
    const result = listCodingAgentChatsQuerySchema.safeParse({ origin: 'WEB' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect('origin' in result.data).toBe(false);
    }
  });

  it('caps how many messages one read may return', () => {
    expect(listCodingAgentMessagesQuerySchema.safeParse({ limit: 501 }).success).toBe(false);
    expect(listCodingAgentMessagesQuerySchema.safeParse({ limit: 500 }).success).toBe(true);
  });

  it('defaults a transcript read to a hundred messages', () => {
    const result = listCodingAgentMessagesQuerySchema.safeParse({});

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.limit).toBe(100);
  });
});
