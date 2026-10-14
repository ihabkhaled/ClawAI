import { createHash } from 'node:crypto';

import { type OpenConsentInput } from '../types/consent-request.types';

/**
 * Identity of one open question: who, which tool on which target, with which arguments, in which
 * conversation. Same inputs, same key, so two cards can never be open for one question.
 * Mirrors the SQL that backfilled `pending_key` (sha256 of the same pipe-joined fields).
 */
export function pendingKeyOf(
  input: Pick<
    OpenConsentInput,
    'userId' | 'toolName' | 'installId' | 'serverId' | 'argsHash' | 'conversationId'
  >,
): string {
  const parts = [
    input.userId,
    input.toolName,
    input.installId ?? '',
    input.serverId ?? '',
    input.argsHash,
    input.conversationId ?? '',
  ];
  return createHash('sha256').update(parts.join('|'), 'utf8').digest('hex');
}
