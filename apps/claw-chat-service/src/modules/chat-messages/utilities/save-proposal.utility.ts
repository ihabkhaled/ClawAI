import type { ContextSaveMode, ContextSaveProposal } from '@claw/shared-types';
import { SaveIntentTarget, type SaveToContextIntent } from '@claw/shared-utilities';
import type { ChatMessage } from '../../../generated/prisma';
import {
  SAVE_INTENT_MEMORY_TEXT_MAX_CHARS,
  SAVE_INTENT_PACK_NAME_MAX_CHARS,
  SAVE_PACK_CHOICE_MAX_OPTIONS,
} from '../constants/save-intent.constants';
import type { SaveIntentVerdict } from '../dto/save-intent-verdict.dto';
import type { ChatPackOptionResponse } from '../types/context-save.types';
import { packContentFor } from './save-intent.utility';
import { savedPackName } from './save-confirmation.utility';

/** How a save request is handled for one user turn: ASK unless the client said AUTO (ADR-168). */
export function contextSaveModeOf(message: Pick<ChatMessage, 'metadata'>): ContextSaveMode {
  const metadata = message.metadata;
  if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) return 'ASK';
  return (metadata as Record<string, unknown>)['contextSaveMode'] === 'AUTO' ? 'AUTO' : 'ASK';
}

/**
 * The form the user confirms instead of an immediate save (ADR-168): what the
 * planner decided, pre-filled and editable. The pack text is the user's own
 * words or the previous message kept WHOLE (rule 57 §1); a pack the planner
 * named is matched to the owner's packs, anything else becomes a new pack name.
 * The planner's own words (memory sentence, pack name) are clamped to the same
 * limits the confirm enforces, so the form never opens in a state it cannot save.
 */
export function buildSaveProposal(args: {
  verdict: SaveIntentVerdict;
  userText: string;
  previousText: string;
  packs: readonly ChatPackOptionResponse[];
}): ContextSaveProposal {
  const memory = args.verdict.memory ?? null;
  const planned = args.verdict.contextPack ?? null;
  const named = planned === null ? undefined : namedPack(planned.packName, args.packs);
  return {
    memory:
      memory === null
        ? null
        : { type: memory.type, text: memory.text.slice(0, SAVE_INTENT_MEMORY_TEXT_MAX_CHARS) },
    pack: planned === null ? null : packProposal(planned, named, args),
    options: packOptions(args.packs, named),
  };
}

/**
 * A proposal from the keyword command detector, used when no planner answered
 * (ADR-168): the same form, built from what the detector recognised. The material
 * is the user's whole message (or, for a bare "save this", the message before
 * it), kept whole; a memory the form could not hold becomes a pack. Null when
 * there is nothing to save.
 */
export function buildKeywordSaveProposal(args: {
  intent: SaveToContextIntent;
  userText: string;
  previousText: string;
  packs: readonly ChatPackOptionResponse[];
}): ContextSaveProposal | null {
  const fromUser = args.intent.content.length > 0;
  const content = (fromUser ? args.userText : args.previousText).trim();
  if (content.length === 0) return null;
  const asPack =
    args.intent.target === SaveIntentTarget.CONTEXT_PACK ||
    content.length > SAVE_INTENT_MEMORY_TEXT_MAX_CHARS;
  return {
    memory: asPack ? null : { type: args.intent.memoryType, text: content },
    pack: asPack
      ? {
          source: fromUser ? 'USER_TEXT' : 'PREVIOUS_MESSAGE',
          content,
          packId: null,
          packName: null,
          newPackName: savedPackName(content).slice(0, SAVE_INTENT_PACK_NAME_MAX_CHARS),
        }
      : null,
    options: packOptions(args.packs, undefined),
  };
}

function namedPack(
  packName: string | null | undefined,
  packs: readonly ChatPackOptionResponse[],
): ChatPackOptionResponse | undefined {
  return packName === null || packName === undefined
    ? undefined
    : packs.find((pack) => pack.name.toLowerCase() === packName.toLowerCase());
}

/**
 * The packs the form offers: the first few, plus the pack the user named even
 * when they own more than fit (otherwise the named pack could not be selected).
 */
function packOptions(
  packs: readonly ChatPackOptionResponse[],
  named: ChatPackOptionResponse | undefined,
): ContextSaveProposal['options'] {
  const shown = packs.slice(0, SAVE_PACK_CHOICE_MAX_OPTIONS);
  const withNamed = named === undefined || shown.includes(named) ? shown : [...shown, named];
  return withNamed.map((pack) => ({ id: pack.id, name: pack.name, itemCount: pack.itemCount }));
}

function packProposal(
  planned: NonNullable<SaveIntentVerdict['contextPack']>,
  named: ChatPackOptionResponse | undefined,
  args: { userText: string; previousText: string },
): NonNullable<ContextSaveProposal['pack']> {
  const content = packContentFor(planned.source, args.userText, args.previousText, planned.summary);
  return {
    source: planned.source,
    content,
    packId: named?.id ?? null,
    packName: named?.name ?? null,
    newPackName:
      named === undefined
        ? (planned.newPackName ?? planned.packName ?? savedPackName(content)).slice(
            0,
            SAVE_INTENT_PACK_NAME_MAX_CHARS,
          )
        : null,
  };
}
