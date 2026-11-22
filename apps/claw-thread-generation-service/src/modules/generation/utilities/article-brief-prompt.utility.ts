import {
  BRIEF_CONVERSATION_LEAD,
  BRIEF_NOTE_LEAD,
  BRIEF_SEED_MAX_CHARS,
  BRIEF_SOURCE_MAX_CHARS,
  BRIEF_TITLE_LEAD,
} from '../constants/article-brief.constants';
import { fitConversation } from './conversation-fit.utility';
import { withAttachmentTurns } from './source-attachments.utility';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The conversation's turns, each attached file's text as its own turn after its message. */
function messagesOf(snapshot: Record<string, unknown>): unknown[] {
  const messages = withAttachmentTurns(snapshot)['messages'];
  return Array.isArray(messages) ? messages : [];
}

function titleOf(snapshot: Record<string, unknown>): string {
  const title = snapshot['title'];
  return typeof title === 'string' ? title.trim() : '';
}

/** Only the role and the text reach the planner; ids and timestamps cost tokens and say nothing. */
function compactMessage(message: unknown): unknown {
  return isRecord(message) ? { role: message['role'], content: message['content'] } : message;
}

/** The planner's user prompt: the owner's note as data, then the whole conversation fitted to its budget. */
export function buildBriefUserPrompt(topic: string, snapshot: Record<string, unknown>): string {
  const fitted = fitConversation(messagesOf(snapshot).map(compactMessage), BRIEF_SOURCE_MAX_CHARS);
  const conversation = JSON.stringify({
    messages: fitted.messages,
    ...(fitted.note === null ? {} : { fitNote: fitted.note }),
    ...(typeof snapshot['attachmentNote'] === 'string'
      ? { attachmentNote: snapshot['attachmentNote'] }
      : {}),
  });
  return `${BRIEF_NOTE_LEAD}${JSON.stringify(topic.trim())}${BRIEF_TITLE_LEAD}${JSON.stringify(titleOf(snapshot))}${BRIEF_CONVERSATION_LEAD}${conversation}`;
}

function clip(text: string, maxChars: number): string {
  return [...text.trim()].slice(0, maxChars).join('');
}

/**
 * What the conversation is about when no planner answered: its title, the opening of its first
 * owner message and of its longest one (where the subject is usually laid out), clipped. It seeds
 * research next to the topic box, so an instruction-only box still finds sources about the chat.
 * This reads the conversation only, never classifies the box.
 */
export function conversationSeed(snapshot: Record<string, unknown>): string {
  const ownerTurns = messagesOf(snapshot).flatMap((message) =>
    isRecord(message) && message['role'] === 'USER' && typeof message['content'] === 'string'
      ? [message['content']]
      : [],
  );
  const first = ownerTurns[0] ?? '';
  const longest = ownerTurns.reduce((best, turn) => (turn.length > best.length ? turn : best), '');
  const half = Math.floor(BRIEF_SEED_MAX_CHARS / 2);
  const parts = [
    titleOf(snapshot),
    clip(first, half),
    longest === first ? '' : clip(longest, half),
  ];
  return clip(parts.filter((part) => part.length > 0).join('. '), BRIEF_SEED_MAX_CHARS);
}
