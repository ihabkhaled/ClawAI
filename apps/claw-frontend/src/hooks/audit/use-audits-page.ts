import { useState } from 'react';

import type { AuditAction, AuditSeverity } from '@/enums';
import { useAuditLogs } from '@/hooks/audit/use-audit-logs';
import { usePagination } from '@/hooks/use-pagination';
import { useTranslation } from '@/lib/i18n';
import type { UseAuditsPageReturn } from '@/types';

export function useAuditsPage(): UseAuditsPageReturn {
  // Page and page-size state is the shared control's, not this page's: every
  // paged list here gets the same clamping and the same reset-on-resize.
  const { page, pageSize, goToPage, setPageSize, reset } = usePagination();
  const [action, setAction] = useState<string | undefined>();
  const [severity, setSeverity] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const { t } = useTranslation();

  const { auditLogs, meta, isLoading, isError } = useAuditLogs({
    page,
    limit: pageSize,
    action: action as AuditAction | undefined,
    severity: severity as AuditSeverity | undefined,
    search: search || undefined,
  });

  const handleActionChange = (value: string | undefined): void => {
    setAction(value);
    reset();
  };

  const handleSeverityChange = (value: string | undefined): void => {
    setSeverity(value);
    reset();
  };

  const handleSearchChange = (value: string): void => {
    setSearch(value);
    reset();
  };

  return {
    t,
    page,
    setPage: goToPage,
    pageSize,
    setPageSize,
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
