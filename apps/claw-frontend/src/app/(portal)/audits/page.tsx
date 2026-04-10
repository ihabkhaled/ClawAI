'use client';

import { AuditContent } from '@/components/audit/audit-content';
import { PageHeader } from '@/components/common/page-header';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ALL_FILTER } from '@/constants';
import { AuditAction, AuditSeverity } from '@/enums';
import { useAuditsPage } from '@/hooks/audit/use-audits-page';

export default function AuditsPage() {
  const {
    t,
    page,
    setPage,
    action,
    severity,
    search,
    auditLogs,
    meta,
    isLoading,
    isError,
    handleActionChange,
    handleSeverityChange,
    handleSearchChange,
  } = useAuditsPage();

  return (
    <div>
      <PageHeader title={t('audits.title')} description={t('audits.description')} />

      <div className="mb-4 flex flex-wrap gap-3">
        <Select
          value={action ?? ALL_FILTER}
          onValueChange={(v) => handleActionChange(v === ALL_FILTER ? undefined : v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t('audits.allActions')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER}>{t('audits.allActions')}</SelectItem>
            {Object.values(AuditAction).map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={severity ?? ALL_FILTER}
          onValueChange={(v) => handleSeverityChange(v === ALL_FILTER ? undefined : v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t('audits.allSeverities')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER}>{t('audits.allSeverities')}</SelectItem>
            {Object.values(AuditSeverity).map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder={t('audits.searchPlaceholder')}
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full sm:w-[200px]"
        />
      </div>

      <AuditContent
        isLoading={isLoading}
        isError={isError}
        auditLogs={auditLogs}
        meta={meta}
        page={page}
        setPage={setPage}
        t={t}
      />
    </div>
  );
}
