import { LINKED_ACCOUNT_REASON_LABEL_KEYS } from '@/constants/admin-security-settings.constants';
import { LinkedAccountReason } from '@/enums/linked-account-reason.enum';

function isLinkedAccountReason(value: string): value is LinkedAccountReason {
  return Object.values<string>(LinkedAccountReason).includes(value);
}

/** Badge copy for each reason, in the server's order; a reason this client does not know is dropped. */
export function resolveLinkedAccountReasonKeys(reasons: ReadonlyArray<string>): string[] {
  return reasons
    .filter(isLinkedAccountReason)
    .map((reason) => LINKED_ACCOUNT_REASON_LABEL_KEYS[reason]);
}
