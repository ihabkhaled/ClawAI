import { describe, expect, it } from 'vitest';

import type { ContextPack, RetrievalPackEntry } from '@/types';
import { groupPackItems, toggledPackIds } from '@/utilities/composer-context.utility';

const pack = (id: string, name: string): ContextPack => ({
  id,
  userId: 'u1',
  name,
  description: null,
  scope: null,
  createdAt: '',
  updatedAt: '',
});

const item = (id: string, contextPackId: string): RetrievalPackEntry =>
  ({ id, contextPackId, content: `text ${id}` }) as RetrievalPackEntry;

describe('groupPackItems', () => {
  it('groups items by pack in first-seen order and names them from the pack list', () => {
    const groups = groupPackItems(
      [item('i1', 'p2'), item('i2', 'p1'), item('i3', 'p2')],
      [pack('p1', 'Trips'), pack('p2', 'ClawAI')],
    );

    expect(groups.map((group) => [group.name, group.items.map((i) => i.id)])).toEqual([
      ['ClawAI', ['i1', 'i3']],
      ['Trips', ['i2']],
    ]);
  });

  it('keeps an item whose pack is not in the list, named by its id', () => {
    const groups = groupPackItems([item('i1', 'gone')], []);

    expect(groups).toEqual([expect.objectContaining({ packId: 'gone', name: 'gone' })]);
  });
});

describe('toggledPackIds', () => {
  it('adds, removes, and refuses to pass the cap', () => {
    expect(toggledPackIds(['a'], 'b', 2)).toEqual(['a', 'b']);
    expect(toggledPackIds(['a', 'b'], 'a', 2)).toEqual(['b']);
    expect(toggledPackIds(['a', 'b'], 'c', 2)).toBeNull();
    expect(toggledPackIds(['a', 'b'], 'b', 2)).toEqual(['a']);
  });
});
