import { describe, expect, it } from 'vitest';

import { PermissionGroupKey } from '@/enums/permission-group.enum';
import { groupPermissions } from '@/utilities/permission-group.utility';

describe('groupPermissions', () => {
  it('returns an empty array for an empty catalog', () => {
    expect(groupPermissions([])).toEqual([]);
  });

  it('buckets permissions by their leading prefix', () => {
    const groups = groupPermissions(['CHAT_READ', 'MEMORY_WRITE', 'ADMIN_PLANS']);
    const keys = groups.map((g) => g.groupKey);
    expect(keys).toContain(PermissionGroupKey.CHAT);
    expect(keys).toContain(PermissionGroupKey.MEMORY);
    expect(keys).toContain(PermissionGroupKey.ADMIN);
  });

  it('routes unknown prefixes into the OTHER bucket', () => {
    const groups = groupPermissions(['UNKNOWN_THING']);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.groupKey).toBe(PermissionGroupKey.OTHER);
    expect(groups[0]?.permissions).toEqual(['UNKNOWN_THING']);
  });

  it('routes CONTEXT_PACK_ permissions to the CONTEXT_PACK bucket (longest-prefix wins)', () => {
    const groups = groupPermissions(['CONTEXT_PACK_READ']);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.groupKey).toBe(PermissionGroupKey.CONTEXT_PACK);
  });

  it('alphabetises permissions within a group', () => {
    const groups = groupPermissions(['CHAT_WRITE', 'CHAT_DELETE', 'CHAT_READ']);
    const chat = groups.find((g) => g.groupKey === PermissionGroupKey.CHAT);
    expect(chat?.permissions).toEqual(['CHAT_DELETE', 'CHAT_READ', 'CHAT_WRITE']);
  });

  it('omits empty groups and orders groups by the configured display order', () => {
    const groups = groupPermissions(['ADMIN_X', 'CHAT_Y', 'MEMORY_Z']);
    // Display order is CHAT, MEMORY, CONTEXT_PACK, WORKSPACE, ADMIN, OTHER.
    expect(groups.map((g) => g.groupKey)).toEqual([
      PermissionGroupKey.CHAT,
      PermissionGroupKey.MEMORY,
      PermissionGroupKey.ADMIN,
    ]);
  });

  it('groups all five known prefixes plus OTHER together', () => {
    const groups = groupPermissions([
      'CHAT_A',
      'MEMORY_A',
      'CONTEXT_PACK_A',
      'WORKSPACE_A',
      'ADMIN_A',
      'MISC_A',
    ]);
    expect(groups.map((g) => g.groupKey)).toEqual([
      PermissionGroupKey.CHAT,
      PermissionGroupKey.MEMORY,
      PermissionGroupKey.CONTEXT_PACK,
      PermissionGroupKey.WORKSPACE,
      PermissionGroupKey.ADMIN,
      PermissionGroupKey.OTHER,
    ]);
  });
});
