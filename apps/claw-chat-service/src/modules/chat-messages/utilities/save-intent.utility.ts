import { detectSaveToContextIntent } from '@claw/shared-utilities';
import { ContextSaveStatus, SaveContentSource } from '../../../common/enums';
import {
  SAVE_INTENT_PREVIOUS_EXCERPT_CHARS,
  SAVE_INTENT_SYSTEM_PROMPT,
  SAVE_INTENT_USER_EXCERPT_CHARS,
  SAVE_PREFILTER_WORDS,
} from '../constants/save-intent.constants';
import { type SaveIntentVerdict, saveIntentVerdictSchema } from '../dto/save-intent-verdict.dto';
import type { ChatMessage } from '../../../generated/prisma';
import type { ContextSaveRecord } from '../types/context-save.types';

/**
 * Whether the planner should even be asked. A recall net, not a decision: it
 * is broad on purpose and the model decides (ADR-133). The keyword command
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
      '- The context-pack part is waiting for the user to pick a pack. A card under your reply',
    );
    lines.push(
      '  lists their packs and a "New pack" option. Ask them, in one short sentence, to choose.',
    );
  }
  lines.push(
    "Confirm this to the user briefly, in the user's language, and include each link above as a markdown link.",
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
