import {
  CONTEXT_SAVE_DEFAULT_MEMORY_TYPE,
  CONTEXT_SAVE_MEMORY_MAX_CHARS,
  CONTEXT_SAVE_NEW_PACK_CHOICE,
  CONTEXT_SAVE_PACK_CONTENT_MAX_CHARS,
  CONTEXT_SAVE_PACK_NAME_MAX_CHARS,
  CONTEXT_SAVE_PROPOSAL_ERROR_REASON_KEYS,
  CONTEXT_SAVE_PROPOSAL_PARTIAL_KEY,
} from '@/constants/context-save.constants';
import { ContextSaveFieldError, ContextSaveStatus, MessageRole } from '@/enums';
import type {
  ChatMessage,
  ContextSaveProposal,
  ContextSaveProposalConfirmRequest,
  ContextSaveProposalDraft,
  ContextSaveProposalErrors,
  ContextSaveProposalTarget,
  TranslateFunction,
} from '@/types';
import { resolveApiErrorMessage } from '@/utilities/api-error-message.utility';
import { contextSaveOfMessage } from '@/utilities/context-save.utility';

/**
 * Which pack the form starts on. An existing pack only when the server's match
 * is really one of the offered options; otherwise a new pack when there is a
 * name for one or nothing to choose from; otherwise nothing, so the user picks
 * on purpose instead of the content landing in a pack by accident.
 */
function initialPackChoice(proposal: ContextSaveProposal): string {
  const pack = proposal.pack;
  if (pack === null) {
    return '';
  }
  if (pack.packId !== null && proposal.options.some((option) => option.id === pack.packId)) {
    return pack.packId;
  }
  if (pack.newPackName !== null || pack.packName !== null || proposal.options.length === 0) {
    return CONTEXT_SAVE_NEW_PACK_CHOICE;
  }
  return '';
}

/** A name for a new pack: the one the user gave, else a name they used that matched no pack. */
function initialNewPackName(proposal: ContextSaveProposal): string {
  const pack = proposal.pack;
  if (pack === null) {
    return '';
  }
  return pack.newPackName ?? (pack.packId === null ? pack.packName : null) ?? '';
}

/** The form's first state: the model's proposal, whole, nothing trimmed (rule 57 section 1). */
export function buildProposalDraft(proposal: ContextSaveProposal): ContextSaveProposalDraft {
  return {
    includeMemory: proposal.memory !== null,
    memoryType: proposal.memory?.type ?? CONTEXT_SAVE_DEFAULT_MEMORY_TYPE,
    memoryText: proposal.memory?.text ?? '',
    includePack: proposal.pack !== null,
    packContent: proposal.pack?.content ?? '',
    packChoice: initialPackChoice(proposal),
    newPackName: initialNewPackName(proposal),
  };
}

function textError(value: string, max: number): ContextSaveFieldError | null {
  if (value.trim().length === 0) {
    return ContextSaveFieldError.EMPTY;
  }
  return value.length > max ? ContextSaveFieldError.TOO_LONG : null;
}

function newPackNameError(draft: ContextSaveProposalDraft): ContextSaveFieldError | null {
  if (!draft.includePack || draft.packChoice !== CONTEXT_SAVE_NEW_PACK_CHOICE) {
    return null;
  }
  return textError(draft.newPackName.trim(), CONTEXT_SAVE_PACK_NAME_MAX_CHARS);
}

/** Errors only for a section that is switched on; an off section cannot block a save. */
export function validateProposalDraft(draft: ContextSaveProposalDraft): ContextSaveProposalErrors {
  return {
    nothingSelected: !draft.includeMemory && !draft.includePack,
    memoryText: draft.includeMemory
      ? textError(draft.memoryText, CONTEXT_SAVE_MEMORY_MAX_CHARS)
      : null,
    packContent: draft.includePack
      ? textError(draft.packContent, CONTEXT_SAVE_PACK_CONTENT_MAX_CHARS)
      : null,
    packChoice:
      draft.includePack && draft.packChoice === '' ? ContextSaveFieldError.REQUIRED : null,
    newPackName: newPackNameError(draft),
  };
}

export function hasProposalErrors(errors: ContextSaveProposalErrors): boolean {
  return (
    errors.nothingSelected ||
    errors.memoryText !== null ||
    errors.packContent !== null ||
    errors.packChoice !== null ||
    errors.newPackName !== null
  );
}

/**
 * The request the server receives, or null while the form is not valid. Text is
 * sent as typed (only an all-blank value is refused); a pack name is trimmed
 * because a name is an identifier, not content.
 */
export function draftToConfirmRequest(
  draft: ContextSaveProposalDraft,
): ContextSaveProposalConfirmRequest | null {
  if (hasProposalErrors(validateProposalDraft(draft))) {
    return null;
  }
  const isNewPack = draft.packChoice === CONTEXT_SAVE_NEW_PACK_CHOICE;
  return {
    memory: draft.includeMemory ? { type: draft.memoryType, text: draft.memoryText } : null,
    pack: draft.includePack
      ? {
          packId: isNewPack ? null : draft.packChoice,
          newPackName: isNewPack ? draft.newPackName.trim() : null,
          content: draft.packContent,
        }
      : null,
  };
}

/** The open proposal on one message, or null when it is not (or no longer) PROPOSED. */
export function proposalTargetOfMessage(
  message: ChatMessage | undefined,
): ContextSaveProposalTarget | null {
  if (message === undefined || message.role !== MessageRole.ASSISTANT) {
    return null;
  }
  const record = contextSaveOfMessage(message.metadata);
  if (record === null || record.status !== ContextSaveStatus.PROPOSED || !record.proposal) {
    return null;
  }
  return { messageId: message.id, proposal: record.proposal };
}

/**
 * The sentence for a confirm that saved only part of the proposal: always "part of
 * this was not saved", followed by the translated reason when the code is a known one.
 */
export function proposalErrorText(code: string | undefined, t: TranslateFunction): string {
  const reasonKey = code === undefined ? undefined : CONTEXT_SAVE_PROPOSAL_ERROR_REASON_KEYS[code];
  const intro = t(CONTEXT_SAVE_PROPOSAL_PARTIAL_KEY);
  return reasonKey === undefined ? intro : `${intro} ${t(reasonKey)}`;
}

/**
 * The sentence for a confirm or dismissal whose call failed outright. A plan or
 * availability code the proposal already has wording for uses that wording
 * (the same text a half-saved confirm shows); anything else goes through the
 * shared API error mapping.
 */
export function proposalFailureText(error: unknown, t: TranslateFunction): string {
  const code =
    error !== null && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
      ? error.code
      : undefined;
  if (code !== undefined && CONTEXT_SAVE_PROPOSAL_ERROR_REASON_KEYS[code] !== undefined) {
    return proposalErrorText(code, t);
  }
  return resolveApiErrorMessage(error, t, t('chat.contextSave.proposal.failed'));
}

/**
 * A short fingerprint of a proposal (djb2 over its JSON). When the server hands
 * back a different proposal - the half that already saved is gone - the form
 * re-seeds from it instead of re-sending what was saved.
 */
export function proposalRevision(proposal: ContextSaveProposal): string {
  const json = JSON.stringify(proposal);
  let hash = 5381;
  for (let index = 0; index < json.length; index += 1) {
    hash = ((hash * 33) ^ json.charCodeAt(index)) >>> 0;
  }
  return `${json.length}:${hash.toString(36)}`;
}
