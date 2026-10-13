import { ContextSaveFieldError } from '@/enums';
import type { ContextSaveMemoryType, ContextSaveMode } from '@/types';

import { CONTEXT_PACK_ITEM_CONTENT_MAX_CHARS } from './memory.constants';

/**
 * Per-viewer choice between asking first and saving at once (ADR-168). The
 * stored key is this base plus the signed-in user's id, so one account's AUTO
 * never reaches the next account on the same browser.
 */
export const CONTEXT_SAVE_MODE_STORAGE_KEY = 'claw:context-save-mode';

export const CONTEXT_SAVE_MODE_ASK: ContextSaveMode = 'ASK';
export const CONTEXT_SAVE_MODE_AUTO: ContextSaveMode = 'AUTO';
export const DEFAULT_CONTEXT_SAVE_MODE: ContextSaveMode = CONTEXT_SAVE_MODE_ASK;

/** Fired in this tab when the mode changes, so every subscriber re-reads it. */
export const CONTEXT_SAVE_MODE_CHANGE_EVENT = 'claw:context-save-mode-change';

/** The pack select's value for "create a new pack". */
export const CONTEXT_SAVE_NEW_PACK_CHOICE = '__new__';

export const CONTEXT_SAVE_MEMORY_TYPES: readonly ContextSaveMemoryType[] = [
  'FACT',
  'PREFERENCE',
  'INSTRUCTION',
  'SUMMARY',
];

export const CONTEXT_SAVE_DEFAULT_MEMORY_TYPE: ContextSaveMemoryType = 'FACT';

export const CONTEXT_SAVE_MEMORY_TYPE_LABELS: Record<ContextSaveMemoryType, string> = {
  FACT: 'memory.typeFact',
  PREFERENCE: 'memory.typePreference',
  INSTRUCTION: 'memory.typeInstruction',
  SUMMARY: 'memory.typeSummary',
};

/**
 * The numbers chat-service's confirm DTO enforces (SAVE_INTENT_MEMORY_TEXT_MAX_CHARS,
 * SAVE_INTENT_PACK_NAME_MAX_CHARS, SAVE_PACK_CONTENT_MAX_CHARS in
 * save-intent.constants.ts). The memory field also holds a SUMMARY memory, so it is
 * as long as a summary may be (SAVE_INTENT_SUMMARY_MAX_CHARS). A test reads that file and fails if they drift, so a
 * value the form accepts is never one the server refuses.
 */
export const CONTEXT_SAVE_MEMORY_MAX_CHARS = 4_000;
export const CONTEXT_SAVE_PACK_NAME_MAX_CHARS = 120;
export const CONTEXT_SAVE_PACK_CONTENT_MAX_CHARS = CONTEXT_PACK_ITEM_CONTENT_MAX_CHARS;

/** DOM id of the chat composer's textarea, so a closing dialog can hand focus back. */
export const CHAT_COMPOSER_INPUT_ID = 'chat-composer-input';

/** i18n keys for a field error code. */
export const CONTEXT_SAVE_ERROR_KEYS: Record<ContextSaveFieldError, string> = {
  [ContextSaveFieldError.EMPTY]: 'chat.contextSave.proposal.errors.empty',
  [ContextSaveFieldError.TOO_LONG]: 'chat.contextSave.proposal.errors.tooLong',
  [ContextSaveFieldError.REQUIRED]: 'chat.contextSave.proposal.errors.packRequired',
};

/** Error codes a half-saved confirm reports (`proposalError`), mapped to their reason text. */
export const CONTEXT_SAVE_PROPOSAL_ERROR_REASON_KEYS: Record<string, string> = {
  PLAN_FEATURE_DISABLED: 'chat.contextSave.reasons.PLAN',
  PLAN_CONTEXT_PACK_LIMIT_EXCEEDED: 'chat.contextSave.reasons.LIMIT',
  CONTEXT_SAVE_UNAVAILABLE: 'chat.contextSave.reasons.UNAVAILABLE',
};

/** Shown when a confirm saved only part of the proposal and the code is not a known one. */
export const CONTEXT_SAVE_PROPOSAL_PARTIAL_KEY = 'chat.contextSave.proposal.partialFailed';
