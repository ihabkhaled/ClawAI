import { type RouterAdminOverride as PrismaRouterAdminOverride } from '../../../generated/prisma';
import { type RouterAdminOverrideRecord } from '../types/router-model-registry.types';

export function mapPrismaOverrideToRecord(
  row: PrismaRouterAdminOverride,
): RouterAdminOverrideRecord {
  return {
    id: row.id,
    profileId: row.profileId,
    fieldName: row.fieldName,
    fieldValue: row.fieldValue,
    reason: row.reason,
    setBy: row.setBy,
    setAt: row.setAt,
    isActive: row.isActive,
  };
}
