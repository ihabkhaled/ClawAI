import { createHash } from 'node:crypto';

import {
  THREAD_SNAPSHOT_MAX_BYTES,
  THREAD_SNAPSHOT_MAX_MESSAGES,
  THREAD_SNAPSHOT_SCHEMA_VERSION,
} from '../constants/thread-snapshot.constants';
import type {
  ThreadSnapshot,
  ThreadSnapshotInput,
  ThreadSnapshotMessageInput,
} from '../types/thread-snapshot.types';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function shouldExclude(message: ThreadSnapshotMessageInput): boolean {
  const metadata = isObject(message.metadata) ? message.metadata : {};
  const state = typeof metadata['status'] === 'string' ? metadata['status'].toLowerCase() : '';
  return (
    (message.role !== 'USER' && message.role !== 'ASSISTANT') ||
    message.content.trim().length === 0 ||
    metadata['error'] === true ||
    metadata['aborted'] === true ||
    metadata['placeholder'] === true ||
    metadata['duplicate'] === true ||
    metadata['duplicateChunk'] === true ||
    ['failed', 'aborted', 'placeholder', 'duplicate'].includes(state) ||
    [
      /\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password)\s*[:=]\s*[^\s,;]+/i,
      /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/i,
      /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
      /\bsk-(?:live|proj|ant)-[A-Za-z0-9_-]{12,}/i,
    ].some((pattern) => pattern.test(message.content))
  );
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

  const messages = input.messages
    .filter((message) => !shouldExclude(message))
    .map((message) => ({
      id: message.id,
      role: message.role as 'USER' | 'ASSISTANT',
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    }));
  const base = {
    schemaVersion: THREAD_SNAPSHOT_SCHEMA_VERSION,
    sourceThreadId: input.threadId,
    title: input.title,
    sourceCreatedAt: input.createdAt.toISOString(),
    messageCount: messages.length,
    messages,
  };
  const byteCount = Buffer.byteLength(JSON.stringify(base), 'utf8');
  if (byteCount > maxBytes) {
    throw new Error(`Thread snapshot exceeds the ${String(maxBytes)} byte limit`);
  }
  const withByteCount = { ...base, byteCount };
  const sha256 = createHash('sha256').update(JSON.stringify(withByteCount)).digest('hex');
  return { ...withByteCount, sha256 };
}
