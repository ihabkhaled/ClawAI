import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MemoryCard } from '@/components/memory/memory-card';
import { Direction } from '@/enums/direction.enum';
import { Locale } from '@/enums/locale.enum';
import { MemoryRetention } from '@/enums/memory-retention.enum';
import { MemoryScope } from '@/enums/memory-scope.enum';
import { MemorySensitivity } from '@/enums/memory-sensitivity.enum';
import { MemorySource } from '@/enums/memory-source.enum';
import { MemoryType } from '@/enums/memory-type.enum';
import type { MemoryRecord } from '@/types';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    locale: Locale.EN,
    dir: Direction.LTR,
  }),
}));

const memory: MemoryRecord = {
  id: 'mem-1',
  userId: 'u1',
  type: MemoryType.FACT,
  content: '# Documentation Date\n\n**Required.** `Documentation Date cannot be in the future.`',
  sourceThreadId: null,
  sourceMessageId: null,
  isEnabled: true,
  scope: MemoryScope.USER,
  scopeRef: null,
  tags: [],
  category: null,
  priority: 50,
  confidence: 1,
  source: MemorySource.USER_MANUAL,
  sensitivity: MemorySensitivity.NORMAL,
  retentionPolicy: MemoryRetention.PERMANENT,
  expiresAt: null,
  pinned: false,
  pausedUntil: null,
  qualityScore: 0.5,
  useCount: 0,
  lastUsedAt: null,
  provenanceJson: null,
  createdAt: '2026-09-29T00:00:00.000Z',
  updatedAt: '2026-09-29T00:00:00.000Z',
};

describe('MemoryCard (owner bug 8 — memories are markdown)', () => {
  it('renders the memory as markdown, not as raw text', () => {
    render(
      <MemoryCard
        memory={memory}
        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        isTogglePending={false}
      />,
    );
    const body = screen.getByTestId('memory-card-content');
    expect(within(body).getByRole('heading', { name: 'Documentation Date' })).toBeInTheDocument();
    expect(within(body).getByText('Required.').tagName).toBe('STRONG');
    expect(body.textContent).not.toContain('# Documentation Date');
  });
});
