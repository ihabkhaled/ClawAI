import { PERMISSION_GROUP_ORDER, PERMISSION_GROUP_PREFIXES } from '@/constants/role.constants';
import { PermissionGroupKey } from '@/enums/permission-group.enum';
import type { PermissionGroup } from '@/types';

function resolveGroupKey(permission: string): PermissionGroupKey {
  for (const { groupKey, prefix } of PERMISSION_GROUP_PREFIXES) {
    if (permission.startsWith(prefix)) {
      return groupKey;
    }
  }
  return PermissionGroupKey.OTHER;
}

// Buckets the full permission catalog into ordered, prefix-based groups for the
// role grant matrix. Permissions inside each group are alphabetised; empty
// groups are omitted.
export function groupPermissions(catalog: string[]): PermissionGroup[] {
  const buckets = new Map<PermissionGroupKey, string[]>();
  for (const permission of catalog) {
    const key = resolveGroupKey(permission);
    const existing = buckets.get(key) ?? [];
    existing.push(permission);
    buckets.set(key, existing);
  }

  const result: PermissionGroup[] = [];
  for (const groupKey of PERMISSION_GROUP_ORDER) {
    const permissions = buckets.get(groupKey);
    if (permissions !== undefined && permissions.length > 0) {
      result.push({
        groupKey,
        permissions: [...permissions].sort((a, b) => a.localeCompare(b)),
      });
    }
  }
  return result;
}
