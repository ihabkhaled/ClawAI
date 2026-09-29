import { describe, expect, it } from 'vitest';

import type { ThreadLineage } from '@/types';
import { buildLineageBarProps } from '@/utilities/thread-lineage.utility';

const LABELS = {
  branchedFromLabel: 'Branched from',
  sourceDeletedLabel: 'Source deleted',
  branchesLabel: 'Branches (1)',
  untitledLabel: 'Untitled',
};

const entry = (id: string, title: string | null = id) => ({
  id,
  title,
  createdAt: '2026-09-01T00:00:00Z',
  branchedFromMessageId: null,
});

const lineage = (overrides: Partial<ThreadLineage>): ThreadLineage => ({
  threadId: 't',
  parent: null,
  parentDeleted: false,
  forkMessageId: null,
  branches: [],
  ...overrides,
});

describe('buildLineageBarProps', () => {
  it('hides the strip for an ordinary thread, so it costs no height', () => {
    expect(buildLineageBarProps(lineage({}), LABELS).visible).toBe(false);
    expect(buildLineageBarProps(null, LABELS).visible).toBe(false);
  });

  it('links the source of a branch', () => {
    const props = buildLineageBarProps(lineage({ parent: entry('src', 'Trip plan') }), LABELS);

    expect(props.visible).toBe(true);
    expect(props.parent).toEqual({ id: 'src', label: 'Trip plan', href: '/chat/src' });
  });

  it('names an untitled source with the untitled label rather than an empty link', () => {
    const props = buildLineageBarProps(lineage({ parent: entry('src', null) }), LABELS);

    expect(props.parent?.label).toBe('Untitled');
  });

  it('shows a deleted source instead of pretending the thread is not a branch', () => {
    const props = buildLineageBarProps(lineage({ parentDeleted: true }), LABELS);

    expect(props.visible).toBe(true);
    expect(props.parent).toBeNull();
    expect(props.parentDeleted).toBe(true);
  });

  it('lists branches cut from this thread', () => {
    const props = buildLineageBarProps(lineage({ branches: [entry('b1'), entry('b2')] }), LABELS);

    expect(props.visible).toBe(true);
    expect(props.branches.map((link) => link.href)).toEqual(['/chat/b1', '/chat/b2']);
  });
});
