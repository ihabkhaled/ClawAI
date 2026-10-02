import { type ModelKind } from '../../../generated/prisma';
import { NON_CHAT_KIND_RULES } from '../constants/model-kind.constants';

/**
 * The non-chat kind a model id says it has, or `null` when the id gives no
 * such signal (the stored kind then stands). Only `CHAT` is offered to users
 * and to the router; every other kind is hidden from the picker.
 */
export function nonChatKindForModelKey(modelKey: string): ModelKind | null {
  const rule = NON_CHAT_KIND_RULES.find(([pattern]) => pattern.test(modelKey));
  return rule === undefined ? null : rule[1];
}

/** Spreadable `{ kind }` for a Prisma write; empty when the id gives no non-chat signal. */
export function nonChatKind(modelKey: string): { kind?: ModelKind } {
  const kind = nonChatKindForModelKey(modelKey);
  return kind === null ? {} : { kind };
}
