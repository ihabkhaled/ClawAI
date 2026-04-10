import { useState } from 'react';

import type { AuditAction, AuditSeverity } from '@/enums';
import { useAuditLogs } from '@/hooks/audit/use-audit-logs';
import { useTranslation } from '@/lib/i18n';
import type { UseAuditsPageReturn } from '@/types';

export function useAuditsPage(): UseAuditsPageReturn {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<string | undefined>();
  const [severity, setSeverity] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const { t } = useTranslation();

  const { auditLogs, meta, isLoading, isError } = useAuditLogs({
    page,
    limit: 20,
    action: action as AuditAction | undefined,
    severity: severity as AuditSeverity | undefined,
    search: search || undefined,
  });

  const handleActionChange = (value: string | undefined): void => {
    setAction(value);
    setPage(1);
  };

  const handleSeverityChange = (value: string | undefined): void => {
    setSeverity(value);
    setPage(1);
  };

  const handleSearchChange = (value: string): void => {
    setSearch(value);
    setPage(1);
  };

  return {
    t,
    page,
    setPage,
    action,
    setAction,
    severity,
    setSeverity,
    search,
    setSearch,
    auditLogs,
    meta,
    isLoading,
    isError,
    handleActionChange,
    handleSeverityChange,
    handleSearchChange,
  };
}
