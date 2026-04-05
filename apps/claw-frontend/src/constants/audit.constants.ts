import { AuditSeverity } from '@/enums';

export const SEVERITY_COLORS: Record<AuditSeverity, string> = {
  [AuditSeverity.LOW]: 'bg-green-100 text-green-800 border-green-200',
  [AuditSeverity.MEDIUM]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [AuditSeverity.HIGH]: 'bg-orange-100 text-orange-800 border-orange-200',
  [AuditSeverity.CRITICAL]: 'bg-red-100 text-red-800 border-red-200',
};

export const ALL_FILTER = '__all__';
