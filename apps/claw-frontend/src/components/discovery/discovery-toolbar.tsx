'use client';

import { Loader2, PlayCircle, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DISCOVERY_STATUS_OPTIONS } from '@/constants';
import type { CandidateStatus } from '@/enums';
import type { DiscoveryToolbarProps } from '@/types';

export function DiscoveryToolbar({
  statusFilter,
  searchFilter,
  onStatusChange,
  onSearchChange,
  onTriggerRefresh,
  onTriggerDryRun,
  isTriggerPending,
  t,
}: DiscoveryToolbarProps): React.ReactElement {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          value={searchFilter}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('discovery.searchPlaceholder')}
          className="w-64"
        />
      </div>
      <Select
        value={statusFilter ?? 'ALL'}
        onValueChange={(v) => onStatusChange(v === 'ALL' ? undefined : (v as CandidateStatus))}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder={t('discovery.filter.status')} />
        </SelectTrigger>
        <SelectContent>
          {DISCOVERY_STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {t(opt.label)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" onClick={onTriggerDryRun} disabled={isTriggerPending}>
          {isTriggerPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {t('discovery.actions.dryRun')}
        </Button>
        <Button onClick={onTriggerRefresh} disabled={isTriggerPending}>
          <PlayCircle className="h-4 w-4" />
          {t('discovery.actions.refresh')}
        </Button>
      </div>
    </div>
  );
}
