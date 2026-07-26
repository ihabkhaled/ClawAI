import { WEBHOOK_EVENT_ID_MAX_LENGTH } from '../constants/webhook.constants';
import { asBoundedString } from './webhook-payload.utility';

/**
 * Paymob sends the transaction id as a JSON number, not a string.
 *
 * It is normalized to a string here for storage. The integer check matters: a
 * float or a non-finite value would stringify into something that can never
 * match on a later lookup, silently breaking replay detection.
 */
export function asPaymobTransactionId(value: unknown): string | null {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return String(value);
  }
  return asBoundedString(value, WEBHOOK_EVENT_ID_MAX_LENGTH);
}
