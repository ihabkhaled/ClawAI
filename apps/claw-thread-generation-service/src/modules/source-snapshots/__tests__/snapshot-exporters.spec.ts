import { describe, expect, it } from 'vitest';

import {
  exportSnapshotJson,
  exportSnapshotMarkdown,
  exportSnapshotToon,
} from '../snapshot-exporters';
import type { ThreadSnapshot } from '../types/thread-snapshot.types';

const snapshot: ThreadSnapshot = {
  schemaVersion: 1,
  sourceThreadId: 'thread-1',
  title: 'Research',
  sourceCreatedAt: '2026-10-01T10:00:00.000Z',
  messageCount: 1,
  byteCount: 44,
  sha256: 'a'.repeat(64),
  messages: [
    {
      id: 'message-1',
      role: 'USER' as const,
      content: 'Question with `code`',
      createdAt: '2026-10-01T12:00:00.000Z',
    },
  ],
};

describe('snapshot exporters', () => {
  it('exports stable JSON and readable Markdown without hidden fields', () => {
    expect(exportSnapshotJson(snapshot)).toBe(exportSnapshotJson(snapshot));
    expect(exportSnapshotMarkdown(snapshot)).toContain('Question with `code`');
    expect(exportSnapshotMarkdown(snapshot)).toContain('Source snapshot');
  });

  it('reports TOON unavailable without claiming a conversion', () => {
    expect(exportSnapshotToon(snapshot)).toEqual({
      available: false,
      reason: 'No verified TOON codec is configured.',
    });
  });
});
