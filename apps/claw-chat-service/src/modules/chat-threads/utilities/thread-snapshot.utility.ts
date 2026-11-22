import { createHash } from 'node:crypto';

import {
  THREAD_SNAPSHOT_ATTACHMENT_HEAD_SHARE,
  THREAD_SNAPSHOT_ATTACHMENT_MAX_CHARS,
  THREAD_SNAPSHOT_ATTACHMENT_NOTE_RESERVE_BYTES,
  THREAD_SNAPSHOT_ATTACHMENTS_KEY_BYTES,
  THREAD_SNAPSHOT_MAX_ATTACHMENT_FILES,
  THREAD_SNAPSHOT_MAX_BYTES,
  THREAD_SNAPSHOT_MAX_MESSAGES,
  THREAD_SNAPSHOT_SCHEMA_VERSION,
  THREAD_SNAPSHOT_SECRET_PATTERNS,
} from '../constants/thread-snapshot.constants';
import type {
  ThreadSnapshotAttachmentCounts as AttachmentCounts,
  ThreadSnapshotAttachmentCandidate as Candidate,
  ThreadSnapshot,
  ThreadSnapshotAttachment,
  ThreadSnapshotInput,
  ThreadSnapshotMessage,
  ThreadSnapshotMessageInput,
} from '../types/thread-snapshot.types';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasSecret(text: string): boolean {
  return THREAD_SNAPSHOT_SECRET_PATTERNS.some((pattern) => pattern.test(text));
}

function shouldExclude(message: ThreadSnapshotMessageInput, hasAttachedText: boolean): boolean {
  const metadata = isObject(message.metadata) ? message.metadata : {};
  const state = typeof metadata['status'] === 'string' ? metadata['status'].toLowerCase() : '';
  return (
    (message.role !== 'USER' && message.role !== 'ASSISTANT') ||
    (message.content.trim().length === 0 && !hasAttachedText) ||
    metadata['error'] === true ||
    metadata['aborted'] === true ||
    metadata['placeholder'] === true ||
    metadata['duplicate'] === true ||
    metadata['duplicateChunk'] === true ||
    ['failed', 'aborted', 'placeholder', 'duplicate'].includes(state) ||
    hasSecret(message.content)
  );
}

/** A long file by its beginning and end, the cut named, counted in code points. */
function condense(text: string): { text: string; shortened: boolean } {
  const points = [...text];
  if (points.length <= THREAD_SNAPSHOT_ATTACHMENT_MAX_CHARS) return { text, shortened: false };
  const head = Math.ceil(
    THREAD_SNAPSHOT_ATTACHMENT_MAX_CHARS * THREAD_SNAPSHOT_ATTACHMENT_HEAD_SHARE,
  );
  const tail = THREAD_SNAPSHOT_ATTACHMENT_MAX_CHARS - head;
  const omitted = points.length - head - tail;
  const kept = `${points.slice(0, head).join('')}\n[… ${String(omitted)} characters of this file omitted …]\n`;
  return { text: `${kept}${points.slice(points.length - tail).join('')}`, shortened: true };
}

/**
 * The user turn's attached files that have readable text, secrets withheld (rule 42: text only,
 * never bytes). Only USER turns carry attachments into a snapshot.
 */
function attachedTextOf(
  message: ThreadSnapshotMessageInput,
  counts: AttachmentCounts,
): Candidate[] {
  if (message.role !== 'USER') return [];
  return (message.attachments ?? []).flatMap((attachment) => {
    const text = attachment.text?.trim() ?? '';
    if (text.length === 0) {
      counts.noText += 1;
      return [];
    }
    if (hasSecret(text)) {
      counts.withheld += 1;
      return [];
    }
    const fitted = condense(text);
    return [{ name: attachment.name, mimeType: attachment.mimeType, ...fitted }];
  });
}

/**
 * Which attached files fit in what is left of the byte cap, newest turn first: the latest files
 * are the ones a Thread is most likely about. Updates `counts.overBudget` and `counts.shortened`.
 */
function selectWithinBudget(
  candidates: ReadonlyArray<readonly Candidate[]>,
  budgetBytes: number,
  counts: AttachmentCounts,
): ThreadSnapshotAttachment[][] {
  let left = budgetBytes;
  const slots = candidates.map((list) => ({ list, chosen: [] as ThreadSnapshotAttachment[] }));
  for (const { list, chosen } of [...slots].reverse()) {
    for (const { shortened, ...attachment } of list) {
      const keyBytes = chosen.length === 0 ? THREAD_SNAPSHOT_ATTACHMENTS_KEY_BYTES : 1;
      const cost = Buffer.byteLength(JSON.stringify(attachment), 'utf8') + keyBytes;
      if (cost > left) {
        counts.overBudget += 1;
        continue;
      }
      left -= cost;
      chosen.push(attachment);
      if (shortened) counts.shortened += 1;
    }
  }
  return slots.map(({ chosen }) => chosen);
}

/** The honest account of attached text that did not travel whole. Null when all of it did. */
function attachmentNote(counts: AttachmentCounts, unread: number): string | null {
  const parts = [
    counts.overBudget > 0
      ? `${String(counts.overBudget)} attached file(s) left out to keep the snapshot under its size limit, the newest kept`
      : null,
    unread > 0
      ? `${String(unread)} older attached file(s) not read, only the newest ${String(THREAD_SNAPSHOT_MAX_ATTACHMENT_FILES)} are included`
      : null,
    counts.noText > 0 ? `${String(counts.noText)} attached file(s) had no readable text` : null,
    counts.withheld > 0
      ? `${String(counts.withheld)} attached file(s) withheld because they look like they contain a secret`
      : null,
    counts.shortened > 0
      ? `${String(counts.shortened)} attached file(s) show only their beginning and end`
      : null,
  ].filter((part): part is string => part !== null);
  return parts.length === 0 ? null : `Attached file text: ${parts.join('; ')}.`;
}

export function buildThreadSnapshot(
  input: ThreadSnapshotInput,
  limits: { maxMessages?: number; maxBytes?: number } = {},
): ThreadSnapshot {
  const maxMessages = limits.maxMessages ?? THREAD_SNAPSHOT_MAX_MESSAGES;
  const maxBytes = limits.maxBytes ?? THREAD_SNAPSHOT_MAX_BYTES;
  if (input.messages.length > maxMessages) {
    throw new Error(`Thread snapshot exceeds the ${String(maxMessages)} message limit`);
  }

  const counts: AttachmentCounts = { noText: 0, withheld: 0, shortened: 0, overBudget: 0 };
  const kept = input.messages.flatMap((message) => {
    const attached = attachedTextOf(message, counts);
    return shouldExclude(message, attached.length > 0) ? [] : [{ message, attached }];
  });
  const textOnly: ThreadSnapshotMessage[] = kept.map(({ message }) => ({
    id: message.id,
    role: message.role as 'USER' | 'ASSISTANT',
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  }));
  const header = {
    schemaVersion: THREAD_SNAPSHOT_SCHEMA_VERSION,
    sourceThreadId: input.threadId,
    title: input.title,
    sourceCreatedAt: input.createdAt.toISOString(),
    messageCount: textOnly.length,
  };
  // The conversation itself must fit whole (fail closed); attached text fills what is left.
  const textOnlyBytes = Buffer.byteLength(
    JSON.stringify({ ...header, messages: textOnly }),
    'utf8',
  );
  if (textOnlyBytes > maxBytes) {
    throw new Error(`Thread snapshot exceeds the ${String(maxBytes)} byte limit`);
  }

  const selected = selectWithinBudget(
    kept.map(({ attached }) => attached),
    maxBytes - textOnlyBytes - THREAD_SNAPSHOT_ATTACHMENT_NOTE_RESERVE_BYTES,
    counts,
  );
  const messages = textOnly.map((message, index) => {
    const attachments = selected.at(index) ?? [];
    return attachments.length > 0 ? { ...message, attachments } : message;
  });
  const note = attachmentNote(counts, input.unreadAttachmentCount ?? 0);
  const base = { ...header, messages, ...(note === null ? {} : { attachmentNote: note }) };
  const byteCount = Buffer.byteLength(JSON.stringify(base), 'utf8');
  if (byteCount > maxBytes) {
    throw new Error(`Thread snapshot exceeds the ${String(maxBytes)} byte limit`);
  }
  const withByteCount = { ...base, byteCount };
  const sha256 = createHash('sha256').update(JSON.stringify(withByteCount)).digest('hex');
  return { ...withByteCount, sha256 };
}
