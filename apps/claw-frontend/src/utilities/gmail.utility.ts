import type { GmailMessageMetadata } from '../types/gmail.types';

export function extractGmailMetadata(metadata: Record<string, unknown>): GmailMessageMetadata {
  const labelIds = Array.isArray(metadata['labelIds']) ? (metadata['labelIds'] as string[]) : [];

  return {
    subject: typeof metadata['subject'] === 'string' ? metadata['subject'] : '',
    from: typeof metadata['from'] === 'string' ? metadata['from'] : '',
    to: typeof metadata['to'] === 'string' ? metadata['to'] : '',
    threadId: typeof metadata['threadId'] === 'string' ? metadata['threadId'] : '',
    labelIds,
    isUnread: labelIds.includes('UNREAD'),
    snippet: typeof metadata['snippet'] === 'string' ? metadata['snippet'] : '',
  };
}
