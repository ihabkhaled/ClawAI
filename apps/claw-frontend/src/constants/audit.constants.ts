import { AuditSeverity } from '@/enums';

export const SEVERITY_COLORS: Record<AuditSeverity, string> = {
  [AuditSeverity.LOW]:
    'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  [AuditSeverity.MEDIUM]:
    'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
  [AuditSeverity.HIGH]:
    'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
  [AuditSeverity.CRITICAL]:
    'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
};

export const ALL_FILTER = '__all__';
