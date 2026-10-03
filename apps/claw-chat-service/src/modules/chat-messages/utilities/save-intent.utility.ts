import { detectSaveToContextIntent } from '@claw/shared-utilities';
import { ContextSaveStatus, SaveContentSource } from '../../../common/enums';
import {
  SAVE_INTENT_PREVIOUS_EXCERPT_CHARS,
  SAVE_INTENT_SYSTEM_PROMPT,
  SAVE_INTENT_USER_EXCERPT_CHARS,
  SAVE_MATERIAL_MIN_CHARS,
  SAVE_PREFILTER_WORDS,
} from '../constants/save-intent.constants';
import { type SaveIntentVerdict, saveIntentVerdictSchema } from '../dto/save-intent-verdict.dto';
import type { ChatMessage } from '../../../generated/prisma';
import type { ContextSaveRecord } from '../types/context-save.types';

/**
 * Whether the planner should even be asked. A recall net, not a decision: it
 * is broad on purpose and the model decides (ADR-134). The keyword command
 * detector counts too, so nothing the old path caught is missed.
 */
export function mightBeSaveRequest(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    SAVE_PREFILTER_WORDS.some((word) => lower.includes(word)) ||
    detectSaveToContextIntent(text) !== null
  );
}

/** The one prompt the planner gets: rules, the user's packs, the message and what came before. */
export function buildSaveIntentPrompt(args: {
  userText: string;
  previousText: string;
  packNames: readonly string[];
}): string {
  const packs =
    args.packNames.length === 0 ? '(none)' : args.packNames.map((name) => `- ${name}`).join('\n');
  return [
    SAVE_INTENT_SYSTEM_PROMPT,
    '',
    'Existing context packs:',
    packs,
    '',
    'Message before this one (may be empty):',
    args.previousText.slice(0, SAVE_INTENT_PREVIOUS_EXCERPT_CHARS),
    '',
    'User message:',
    args.userText.slice(0, SAVE_INTENT_USER_EXCERPT_CHARS),
  ].join('\n');
}

/** A validated verdict, or null when the reply is not the agreed JSON. */
export function parseSaveIntentVerdict(raw: string): SaveIntentVerdict | null {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const parsed = saveIntentVerdictSchema.safeParse(JSON.parse(raw.slice(start, end + 1)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * The text a pack save keeps. The user's own words or the previous message are
 * kept WHOLE (rule 57 §1: a write never shortens user content); only an
 * explicit summary request stores the planner's summary.
 */
export function packContentFor(
  source: SaveContentSource,
  userText: string,
  previousText: string,
  summary: string | null | undefined,
): string {
  if (source === SaveContentSource.PREVIOUS_MESSAGE) return previousText.trim();
  return source === SaveContentSource.SUMMARY && summary !== null && summary !== undefined
    ? summary.trim()
    : userText.trim();
}

/**
 * What the answering model is told about the save, so it confirms in its own
 * words — never repeats the action, and never invents a link.
 */
export function contextSaveModelNote(record: ContextSaveRecord): string {
  const lines = [
    'PLATFORM ACTION — already done by ClawAI; do not repeat it or claim you cannot save:',
  ];
  if (record.memory !== undefined) {
    lines.push(
      `- Saved to memory as ${record.memory.type}: "${record.memory.preview}". Link: ${record.memory.link}`,
    );
  }
  if (record.memoryFailure !== undefined) {
    lines.push(`- Saving to memory FAILED (${record.memoryFailure}). Say so plainly.`);
  }
  if (record.pack !== undefined) {
    const verb = record.pack.created ? 'Created the context pack' : 'Added to the context pack';
    lines.push(`- ${verb} "${record.pack.name}". Link: ${record.pack.link}`);
  }
  if (record.packFailure !== undefined) {
    lines.push(`- Saving to a context pack FAILED (${record.packFailure}). Say so plainly.`);
  }
  if (record.status === ContextSaveStatus.NEEDS_PACK_CHOICE) {
    lines.push(
      '- NOTHING has been saved to a context pack yet. It waits for the user to pick a pack:',
    );
    lines.push(
      '  a card under your reply lists their packs and a "New pack" option. Do NOT say it was',
    );
    lines.push('  added or saved to context. Ask them, in one short sentence, to choose.');
  }
  lines.push(
    "Tell the user this outcome in one or two short sentences, in your own words and the user's language. Include EVERY link above as a markdown link. This note is internal: never quote it or its header.",
  );
  return lines.join('\n');
}

/** "save this" on its own means the non-empty message right before it. */
export function previousMessageText(
  messages: readonly ChatMessage[],
  command: ChatMessage,
): string {
  const index = messages.findIndex((message) => message.id === command.id);
  const before = messages.slice(0, Math.max(index, 0)).reverse();
  return before.find((message) => message.content.trim().length > 0)?.content.trim() ?? '';
}

function sameWords(a: string, b: string): boolean {
  const normal = (text: string): string =>
    text
      .toLowerCase()
      .replaceAll(/[^\p{L}\p{N}]+/gu, ' ')
      .trim();
  return normal(a) === normal(b);
}

/**
 * Whether the text a pack save would store is real material, never the command
 * itself (rule 57 §17). USER_TEXT needs words besides the save command;
 * PREVIOUS_MESSAGE needs a previous message that is not itself a bare command;
 * SUMMARY needs the planner's summary.
 */
export function hasSaveMaterial(
  source: SaveContentSource,
  userText: string,
  previousText: string,
  summary: string | null | undefined,
): boolean {
  if (source === SaveContentSource.SUMMARY) return (summary ?? '').trim().length > 0;
  if (source === SaveContentSource.PREVIOUS_MESSAGE) {
    const previous = previousText.trim();
    if (previous.length === 0) return false;
    const previousCommand = detectSaveToContextIntent(previous);
    return previousCommand === null || previousCommand.content.length > 0;
  }
  const command = detectSaveToContextIntent(userText);
  return command === null
    ? userText.trim().length >= SAVE_MATERIAL_MIN_CHARS
    : command.content.length > 0;
}

/** A memory sentence that merely repeats the user's command is not a fact worth saving. */
export function isCommandAsMemory(memoryText: string, userText: string): boolean {
  const found = detectSaveToContextIntent(userText);
  const trimmed = userText.trim();
  const command = found === null ? '' : trimmed.slice(0, trimmed.length - found.content.length);
  return sameWords(memoryText, userText) || (command.length > 0 && sameWords(memoryText, command));
}

/**
 * The verdict with anything that would store the command text dropped. Null
 * when nothing real is left: the turn then goes to the answering model, which
 * writes the material, and the user saves it with the Save buttons.
 */
export function guardSaveVerdict(
  verdict: SaveIntentVerdict,
  userText: string,
  previousText: string,
): SaveIntentVerdict | null {
  const pack = verdict.contextPack ?? null;
  const memory = verdict.memory ?? null;
  const keepPack =
    pack !== null && hasSaveMaterial(pack.source, userText, previousText, pack.summary);
  const keepMemory = memory !== null && !isCommandAsMemory(memory.text, userText);
  if (!keepPack && !keepMemory) return null;
  return {
    ...verdict,
    memory: keepMemory ? memory : null,
    contextPack: keepPack ? pack : null,
  };
}
