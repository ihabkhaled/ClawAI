import type { ImplPromptHandoffStatus } from '../../../generated/prisma';

const VALID_STATUSES: ReadonlySet<ImplPromptHandoffStatus> = new Set([
  'PENDING',
  'DELIVERED',
  'FAILED',
] as ImplPromptHandoffStatus[]);

export function parseHandoffStatus(raw: string | undefined): ImplPromptHandoffStatus | undefined {
  if (raw === undefined) return undefined;
  if (VALID_STATUSES.has(raw as ImplPromptHandoffStatus)) {
    return raw as ImplPromptHandoffStatus;
  }
  return undefined;
}
