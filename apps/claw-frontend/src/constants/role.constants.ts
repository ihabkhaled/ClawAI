import { PermissionGroupKey } from '@/enums/permission-group.enum';

// Prefix → group mapping for the role permission grant matrix. Ordered: the
// first matching prefix wins, so the catch-all OTHER bucket is implicit.
// CONTEXT_PACK_ must be checked before any shorter prefix would, but no other
// prefix is a prefix of it, so plain Map order is fine.
export const PERMISSION_GROUP_PREFIXES: ReadonlyArray<{
  groupKey: PermissionGroupKey;
  prefix: string;
}> = [
  { groupKey: PermissionGroupKey.CONTEXT_PACK, prefix: 'CONTEXT_PACK_' },
  { groupKey: PermissionGroupKey.CHAT, prefix: 'CHAT_' },
  { groupKey: PermissionGroupKey.MEMORY, prefix: 'MEMORY_' },
  { groupKey: PermissionGroupKey.WORKSPACE, prefix: 'WORKSPACE_' },
  { groupKey: PermissionGroupKey.ADMIN, prefix: 'ADMIN_' },
];

// Stable display order for permission groups in the matrix.
export const PERMISSION_GROUP_ORDER: readonly PermissionGroupKey[] = [
  PermissionGroupKey.CHAT,
  PermissionGroupKey.MEMORY,
  PermissionGroupKey.CONTEXT_PACK,
  PermissionGroupKey.WORKSPACE,
  PermissionGroupKey.ADMIN,
  PermissionGroupKey.OTHER,
];
