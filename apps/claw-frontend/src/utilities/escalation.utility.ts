import { EscalationChainStatus } from '@/enums';

export type EscalationStatusBadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

export function getEscalationStatusBadgeVariant(
  status: EscalationChainStatus,
): EscalationStatusBadgeVariant {
  if (status === EscalationChainStatus.SINGLE_STEP) {
    return 'default';
  }
  if (status === EscalationChainStatus.RESOLVED_AT_STEP) {
    return 'secondary';
  }
  return 'destructive';
}

export function getEscalationStatusLabel(
  status: EscalationChainStatus,
  t: (key: string) => string,
): string {
  if (status === EscalationChainStatus.SINGLE_STEP) {
    return t('escalation.statusSingleStep');
  }
  if (status === EscalationChainStatus.RESOLVED_AT_STEP) {
    return t('escalation.statusResolved');
  }
  return t('escalation.statusExhausted');
}
