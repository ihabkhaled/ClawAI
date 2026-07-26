import {
  MAX_DESCRIPTION_LENGTH,
  MAX_SNAPSHOT_MESSAGE_CHARS,
  MAX_SNAPSHOT_MESSAGES,
  MAX_TITLE_LENGTH,
  PUBLISHABLE_ROLES,
} from '../constants/chat-shares.constants';
import { type SnapshotMessage } from '../types/chat-shares.types';
import { type ChatMessage, MessageRole } from '../../../generated/prisma';

/**
 * Selects and copies the messages that may be published.
 *
 * Filtering happens HERE, before anything is written to a share table, rather
 * than at read time on the public endpoint. A message that was never copied
 * cannot be leaked by a later bug in the read path — the private data is simply
 * not in the table the public endpoint queries.
 */
export function buildSnapshotMessages(messages: ChatMessage[]): SnapshotMessage[] {
  return messages
    .filter(isPublishable)
    .slice(0, MAX_SNAPSHOT_MESSAGES)
    .map((message, index) => ({
      sequence: index,
      role: message.role,
      content: truncateContent(message.content),
      // Display labels only. `message.provider` is a provider NAME
      // ("anthropic"), not a connector id, so it is safe to show; anything
      // that could identify a connector row is dropped.
      providerLabel: toDisplayLabel(message.provider),
      modelLabel: toDisplayLabel(message.model),
      originalCreatedAt: message.createdAt,
    }));
}

/**
 * Whether a message belongs in a public transcript.
 *
 * SYSTEM is the operator's prompt — business instructions, jailbreak defences,
 * customer-specific configuration. TOOL can carry raw connector output
 * including credentials and internal endpoints. Neither is part of the
 * conversation the user actually had, and neither is ever published.
 *
 * An empty ASSISTANT message means generation failed. Publishing a blank bubble
 * shows a stranger that something broke and adds nothing.
 */
function isPublishable(message: ChatMessage): boolean {
  if (!PUBLISHABLE_ROLES.includes(message.role)) {
    return false;
  }
  if (message.content.trim().length === 0) {
    return false;
  }
  // Messages the execution path marked as errors were never delivered as real
  // answers; they are diagnostics, and diagnostics are internal.
  return !isErrorMessage(message);
}

function isErrorMessage(message: ChatMessage): boolean {
  const metadata = message.metadata;
  if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) {
    return false;
  }
  return (metadata as Record<string, unknown>)['error'] === true;
}

// A single pathological message must not be able to make a public page
// unrenderable. Truncation is visible rather than silent.
function truncateContent(content: string): string {
  if (content.length <= MAX_SNAPSHOT_MESSAGE_CHARS) {
    return content;
  }
  return `${content.slice(0, MAX_SNAPSHOT_MESSAGE_CHARS)}\n\n…`;
}

// Null out anything that is not a short, human-readable label. A long or
// structured value is more likely to be an identifier than a display name.
function toDisplayLabel(value: string | null): string | null {
  if (value === null || value.trim().length === 0 || value.length > 64) {
    return null;
  }
  return value;
}

/**
 * The title shown in the browser tab, the search result and the social card.
 *
 * Falls back to a generic string rather than deriving one from message content:
 * an auto-derived title would put a fragment of the conversation in a search
 * result before any human looked at it.
 */
export function buildShareTitle(threadTitle: string | null, fallback: string): string {
  const candidate = threadTitle?.trim() ?? '';
  if (candidate.length === 0) {
    return fallback;
  }
  return candidate.length > MAX_TITLE_LENGTH
    ? `${candidate.slice(0, MAX_TITLE_LENGTH - 1)}…`
    : candidate;
}

/**
 * A meta description built from the first user message.
 *
 * Deliberately from the USER's opening question, not the assistant's answer:
 * the question is what someone searching would recognise, and it is the part
 * the owner definitely wrote themselves.
 *
 * Returns null when nothing suitable exists. The caller then falls back to a
 * generic description rather than publishing a half-sentence of someone's
 * conversation as a search snippet.
 */
export function buildShareDescription(messages: SnapshotMessage[]): string | null {
  const opening = messages.find((message) => message.role === MessageRole.USER);
  if (opening === undefined) {
    return null;
  }
  // Collapse whitespace and strip markdown structure so the snippet reads as a
  // sentence rather than as source.
  const flattened = opening.content
    .replaceAll(/```[\s\S]*?```/g, ' ')
    .replaceAll(/[#*_`>[\]()]/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim();

  if (flattened.length < 20) {
    return null;
  }
  return flattened.length > MAX_DESCRIPTION_LENGTH
    ? `${flattened.slice(0, MAX_DESCRIPTION_LENGTH - 1)}…`
    : flattened;
}
