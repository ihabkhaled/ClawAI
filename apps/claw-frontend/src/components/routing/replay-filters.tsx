import { Play } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { REPLAY_LIMIT_OPTIONS, ROUTING_MODE_LABELS, ROUTING_MODE_OPTIONS } from '@/constants';
import type { ReplayFiltersFormProps } from '@/types';

export function ReplayFiltersForm({
  routingMode,
  onRoutingModeChange,
  threadId,
  onThreadIdChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  limit,
  onLimitChange,
  saveRun,
  onSaveRunChange,
  runName,
  onRunNameChange,
  onSubmit,
  isPending,
  t,
}: ReplayFiltersFormProps): React.ReactElement {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('common.filter')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="space-y-2">
            <label htmlFor="replay-routing-mode" className="text-sm font-medium">
              {t('routing.mode')}
            </label>
            <Select
              value={routingMode ?? 'all'}
              onValueChange={(v) => onRoutingModeChange(v === 'all' ? undefined : v)}
            >
              <SelectTrigger id="replay-routing-mode" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('audits.allActions')}</SelectItem>
                {ROUTING_MODE_OPTIONS.map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {ROUTING_MODE_LABELS[mode]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="replay-thread-id" className="text-sm font-medium">
              {t('replay.threadIdFilter')}
            </label>
            <Input
              id="replay-thread-id"
              className="w-48"
              placeholder={t('replay.threadIdPlaceholder')}
              value={threadId}
              onChange={(e) => onThreadIdChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="replay-start-date" className="text-sm font-medium">
              {t('replay.startDate')}
            </label>
            <Input
              id="replay-start-date"
              type="date"
              className="w-40"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="replay-end-date" className="text-sm font-medium">
              {t('replay.endDate')}
            </label>
            <Input
              id="replay-end-date"
              type="date"
              className="w-40"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="replay-limit" className="text-sm font-medium">
              {t('replay.totalReplayed')}
            </label>
            <Select value={String(limit)} onValueChange={(v) => onLimitChange(Number(v))}>
              <SelectTrigger id="replay-limit" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPLAY_LIMIT_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={String(opt)}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex items-center gap-2">
            <Checkbox
              id="replay-save-run"
              checked={saveRun}
              onCheckedChange={(v) => onSaveRunChange(v === true)}
            />
            <label htmlFor="replay-save-run" className="text-sm font-medium">
              {t('replay.saveRun')}
            </label>
          </div>

          {saveRun ? (
            <div className="space-y-2">
              <label htmlFor="replay-run-name" className="text-sm font-medium">
                {t('replay.runName')}
              </label>
              <Input
                id="replay-run-name"
                className="w-48"
                placeholder={t('replay.runNamePlaceholder')}
                value={runName}
                onChange={(e) => onRunNameChange(e.target.value)}
              />
            </div>
          ) : null}

          <Button onClick={onSubmit} disabled={isPending}>
            <Play className="me-2 h-4 w-4" />
            {isPending ? t('replay.running') : t('replay.runReplay')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
