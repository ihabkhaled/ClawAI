import { describe, expect, it } from 'vitest';

import {
  applyArchiveSelection,
  countSelectedArchiveMembers,
} from '@/utilities/archive-selection.utility';

describe('applyArchiveSelection', () => {
  it('picking a whole archive drops every member already picked from inside it', () => {
    const result = applyArchiveSelection({
      selectedIds: ['child-1', 'child-2', 'other-file'],
      targetId: 'zip-1',
      checked: true,
      ancestorIds: [],
      ancestryById: new Map([
        ['child-1', ['zip-1']],
        ['child-2', ['zip-1']],
      ]),
    });

    expect(result.selectedIds).toEqual(['other-file', 'zip-1']);
    expect(result.ancestryById.has('child-1')).toBe(false);
    expect(result.ancestryById.has('child-2')).toBe(false);
  });

  it('picking a member drops the whole archive and any archive further out', () => {
    const result = applyArchiveSelection({
      selectedIds: ['zip-outer', 'zip-inner', 'other-file'],
      targetId: 'child-1',
      checked: true,
      ancestorIds: ['zip-outer', 'zip-inner'],
      ancestryById: new Map(),
    });

    expect(result.selectedIds).toEqual(['other-file', 'child-1']);
    expect(result.ancestryById.get('child-1')).toEqual(['zip-outer', 'zip-inner']);
  });

  it('never lets a whole archive and a file from inside it be selected together', () => {
    const afterMember = applyArchiveSelection({
      selectedIds: [],
      targetId: 'child-1',
      checked: true,
      ancestorIds: ['zip-1'],
      ancestryById: new Map(),
    });
    const afterArchive = applyArchiveSelection({
      selectedIds: afterMember.selectedIds,
      targetId: 'zip-1',
      checked: true,
      ancestorIds: [],
      ancestryById: afterMember.ancestryById,
    });

    expect(afterArchive.selectedIds).toEqual(['zip-1']);
    expect(afterArchive.selectedIds).not.toContain('child-1');
  });

  it('unchecking only removes that one id and forgets its ancestry', () => {
    const result = applyArchiveSelection({
      selectedIds: ['child-1', 'other-file'],
      targetId: 'child-1',
      checked: false,
      ancestorIds: [],
      ancestryById: new Map([['child-1', ['zip-1']]]),
    });

    expect(result.selectedIds).toEqual(['other-file']);
    expect(result.ancestryById.has('child-1')).toBe(false);
  });
});

describe('countSelectedArchiveMembers', () => {
  it('counts only ids whose ancestry includes the given archive', () => {
    const ancestry = new Map([
      ['child-1', ['zip-1']],
      ['child-2', ['zip-1']],
      ['child-3', ['zip-2']],
    ]);
    expect(
      countSelectedArchiveMembers(['child-1', 'child-2', 'child-3', 'other'], 'zip-1', ancestry),
    ).toBe(2);
    expect(countSelectedArchiveMembers(['other'], 'zip-1', ancestry)).toBe(0);
  });
});
