import { HttpStatus } from '@nestjs/common';
import type { SaveFailureReason } from '../types/save-to-context.types';

/**
 * AI-decided "save this to memory / a context pack" (ADR-134).
 *
 * The pre-filter only decides whether the planner is ASKED — it is a recall
 * net, deliberately broad, in the 13 UI languages. The planner model decides
 * whether anything is saved, where, and what.
 */
export const SAVE_PREFILTER_WORDS: readonly string[] = [
  // en
  'remember',
  'memorize',
  'memorise',
  'memory',
  'save this',
  'save that',
  'save it',
  'context',
  'keep in mind',
  "don't forget",
  'note this',
  'note that',
  // en: a save asked without the words memory/context ("add this to clawai")
  'add this',
  'add that',
  'store this',
  'store that',
  'keep this',
  'keep that',
  'from now on',
  'going forward',
  'for later',
  'write this down',
  'take note',
  'my notes',
  // ar
  'تذكر',
  'تذكّر',
  'ذاكرة',
  'احفظ',
  'سياق',
  // de
  'merk dir',
  'merke',
  'erinner',
  'speicher',
  'gedächtnis',
  'kontext',
  'notier',
  // es
  'recuerda',
  'memoria',
  'guarda',
  'contexto',
  'anota',
  // fa
  'یادت',
  'به خاطر',
  'حافظه',
  'ذخیره',
  'بسپار',
  'زمینه',
  // fr
  'souviens',
  'mémoire',
  'mémorise',
  'enregistre',
  'contexte',
  'retiens',
  // hi
  'याद',
  'मेमोरी',
  'सहेज',
  'संदर्भ',
  // it
  'ricorda',
  'memoria',
  'salva',
  'contesto',
  'annota',
  // ja
  '覚えて',
  '記憶',
  '保存',
  'コンテキスト',
  'メモして',
  // pt
  'lembra',
  'memória',
  'guarde',
  'salve',
  'contexto',
  'anote',
  // ru
  'запомни',
  'памят',
  'сохрани',
  'контекст',
  // th
  'จำไว้',
  'ความจำ',
  'บันทึกไว้',
  'บริบท',
  // zh
  '记住',
  '记忆',
  '保存',
  '上下文',
  '记下',
];

/** Output budget for the classifier: room for a short summary, nothing more. */
export const SAVE_INTENT_MAX_OUTPUT_TOKENS = 700;

/** How much of the previous message the classifier reads (the saved text is never cut). */
export const SAVE_INTENT_PREVIOUS_EXCERPT_CHARS = 4_000;
export const SAVE_INTENT_USER_EXCERPT_CHARS = 6_000;

/** Bounds on what the classifier may write. */
export const SAVE_INTENT_MEMORY_TEXT_MAX_CHARS = 1_000;
export const SAVE_INTENT_SUMMARY_MAX_CHARS = 4_000;
export const SAVE_INTENT_PACK_NAME_MAX_CHARS = 120;

/**
 * Mirrors memory-service's CONTEXT_PACK_ITEM_CONTENT_MAX_CHARS: text longer
 * than one pack item may hold is refused as LIMIT up front — never cut
 * (rule 57 §1), and never parked as a pending choice that cannot succeed.
 */
export const SAVE_PACK_CONTENT_MAX_CHARS = 250_000;

/** How many of the user's packs the "which pack?" card offers. */
export const SAVE_PACK_CHOICE_MAX_OPTIONS = 20;

export const SAVE_INTENT_SYSTEM_PROMPT = [
  "You decide whether a chat message asks the assistant to SAVE something into the user's",
  'ClawAI memory, a ClawAI context pack, or both. Reply with ONE JSON object and nothing else.',
  '',
  'Definitions:',
  '- MEMORY: a short durable fact, preference or standing instruction about the user or',
  '  their work ("I am vegetarian", "always answer in metric units"). Types: FACT,',
  '  PREFERENCE, INSTRUCTION, SUMMARY (a summary of what was discussed).',
  '- CONTEXT PACK: reference material to reuse later — a document, a spec, an answer, notes.',
  '',
  'Rules:',
  '- save=true ONLY when the user explicitly asks to remember/save/store/add something.',
  '  Questions ABOUT memory ("what do you remember about me?") are save=false.',
  '- Choose MEMORY, CONTEXT PACK or BOTH from what the user asked; when they only say',
  '  "remember this" about a short personal fact, choose MEMORY; about a long answer or',
  '  document, choose CONTEXT PACK.',
  '- When the user asks to save knowledge the assistant would first have to WRITE ("save all info',
  '  about X as a context pack") and neither this message nor the one before it contains that',
  '  material, answer save=false: the assistant writes the material in its reply and the user',
  '  saves that reply with the Save button. Never save the command itself as the material.',
  "- memory.text: one concise sentence in the user's language, stating the fact itself.",
  '- contextPack.source: USER_TEXT when the material is in this message, PREVIOUS_MESSAGE when',
  '  the user points at the message before ("save this answer"), SUMMARY only when the user',
  '  asks for a summary to be saved (then write it in contextPack.summary).',
  '- contextPack.packName: the EXACT name of one of the existing packs listed below if the user',
  '  named it; otherwise null. contextPack.newPackName: a short title for a new pack.',
  '',
  'JSON shape:',
  '{"save": boolean,',
  ' "memory": null | {"type": "FACT"|"PREFERENCE"|"INSTRUCTION"|"SUMMARY", "text": string},',
  ' "contextPack": null | {"source": "USER_TEXT"|"PREVIOUS_MESSAGE"|"SUMMARY", "summary": string|null,',
  '                       "packName": string|null, "newPackName": string|null}}',
].join('\n');

/** memory-service routes added for ADR-134 (service token, owner-scoped). */
export const PACK_OPTIONS_FOR_CHAT_PATH = '/api/v1/internal/context-packs/options-for-chat';
export const CONTEXT_PACKS_INTERNAL_PATH = '/api/v1/internal/context-packs';
export const ADD_ITEM_FROM_CHAT_SUFFIX = '/items/from-chat';

/** How a failed pack choice is reported to the client (translated there by code). */
export const CONTEXT_SAVE_FAILURE_ERRORS: Record<
  SaveFailureReason,
  { code: string; status: HttpStatus }
> = {
  PLAN: { code: 'PLAN_FEATURE_DISABLED', status: HttpStatus.FORBIDDEN },
  LIMIT: { code: 'PLAN_CONTEXT_PACK_LIMIT_EXCEEDED', status: HttpStatus.TOO_MANY_REQUESTS },
  UNAVAILABLE: { code: 'CONTEXT_SAVE_UNAVAILABLE', status: HttpStatus.SERVICE_UNAVAILABLE },
};

/**
 * Opens the save note when it is repeated on the final user turn. The system
 * prompt alone was not enough: a small model (gpt-3.5-turbo, live QA-41)
 * answered "I've added it to your context" while the pack choice was still
 * pending — so the note rides where the model looks most (rule 41 pattern).
 */
export const CONTEXT_SAVE_TURN_MARKER = '[ClawAI platform status — the truth about this turn:]';

/**
 * A message with no recognisable save command still counts as carrying its own
 * material for a pack only from this length: "save all info about ClawAI as a
 * context pack" (44 chars) is a command, not content (rule 57 §17).
 */
export const SAVE_MATERIAL_MIN_CHARS = 120;
