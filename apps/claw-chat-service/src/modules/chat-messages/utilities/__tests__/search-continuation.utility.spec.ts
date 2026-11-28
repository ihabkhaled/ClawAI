import { describe, expect, it } from 'vitest';

import type { ChatMessage } from '../../../../generated/prisma';
import type { ResearchRunResponse } from '../../types/research.types';
import {
  isSearchPromiseMessage,
  userAllowedWeb,
  withPromisedSearch,
} from '../search-continuation.utility';

const run = (id: string, url: string): ResearchRunResponse =>
  ({
    id,
    workflow: 'SEARCH_THEN_FETCH',
    bundle: {
      mode: 'SEARCH_THEN_FETCH',
      items: [{ id: url, title: url, url, snippet: 's', source: 'SEARCH' }],
      warnings: [],
      toolsUsed: ['web_search'],
    },
  }) as unknown as ResearchRunResponse;

const message = (role: string, metadata: unknown = null): ChatMessage =>
  ({ id: `${role}-id`, role, content: 'c', metadata }) as unknown as ChatMessage;

describe('search continuation helpers', () => {
  it('recognises only an assistant promise message', () => {
    expect(
      isSearchPromiseMessage(message('ASSISTANT', { searchContinuation: { status: 'done' } })),
    ).toBe(true);
    expect(isSearchPromiseMessage(message('ASSISTANT', { provider: 'x' }))).toBe(false);
    expect(isSearchPromiseMessage(message('USER', { searchContinuation: {} }))).toBe(false);
    expect(isSearchPromiseMessage(message('ASSISTANT'))).toBe(false);
  });

  it('allows the web only when the user sent a research mode', () => {
    expect(userAllowedWeb({ researchMode: 'AUTO' })).toBe(true);
    expect(userAllowedWeb({ researchMode: 'SEARCH' })).toBe(true);
    expect(userAllowedWeb({ researchMode: 'NONE' })).toBe(false);
    expect(userAllowedWeb({})).toBe(false);
    expect(userAllowedWeb(null)).toBe(false);
  });

  it('adds the search to the last user message without touching the stored rows', () => {
    const rows = [message('USER'), message('ASSISTANT'), message('USER', { fileIds: ['f'] })];
    const next = withPromisedSearch(rows, run('r2', 'https://b.example'));
    const metadata = next[2]?.metadata as Record<string, unknown>;
    expect(metadata['fileIds']).toEqual(['f']);
    expect((metadata['research'] as { runId: string }).runId).toBe('r2');
    expect(next[0]).toBe(rows[0]);
    expect(rows[2]?.metadata).toEqual({ fileIds: ['f'] });
  });

  it('keeps the earlier sources first when research already ran', () => {
    const earlier = run('r1', 'https://a.example');
    const rows = [
      message('USER', {
        research: { runId: earlier.id, mode: earlier.workflow, bundle: earlier.bundle },
      }),
    ];
    const next = withPromisedSearch(rows, run('r2', 'https://b.example'));
    const research = (
      next[0]?.metadata as { research: { bundle: { items: Array<{ url: string }> } } }
    ).research;
    expect(research.bundle.items.map((item) => item.url)).toEqual([
      'https://a.example',
      'https://b.example',
    ]);
  });
});
