import { ThreadSafetyFindingKind } from '@/enums/thread-safety-finding-kind.enum';

/** Label per kind of finding. A plain map so the key reference test sees every key. */
export const THREAD_SAFETY_KIND_KEYS: Readonly<Record<ThreadSafetyFindingKind, string>> = {
  [ThreadSafetyFindingKind.Secret]: 'chat.threadFixSafetyKindSecret',
  [ThreadSafetyFindingKind.Email]: 'chat.threadFixSafetyKindEmail',
  [ThreadSafetyFindingKind.Card]: 'chat.threadFixSafetyKindCard',
  [ThreadSafetyFindingKind.Ssn]: 'chat.threadFixSafetyKindSsn',
  [ThreadSafetyFindingKind.Iban]: 'chat.threadFixSafetyKindIban',
};
