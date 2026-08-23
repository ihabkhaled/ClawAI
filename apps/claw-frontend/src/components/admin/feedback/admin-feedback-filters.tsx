'use client';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FEEDBACK_TYPE_OPTIONS } from '@/constants/feedback.constants';
import { useTranslation } from '@/lib/i18n';
import type { AdminFeedbackFiltersProps } from '@/types/feedback-props.types';

export function AdminFeedbackFilters({
  status,
  onStatusChange,
  type,
  onTypeChange,
  search,
  onSearchChange,
  counts,
}: AdminFeedbackFiltersProps) {
  const { t } = useTranslation();

  const statusTabs = [
    { value: 'all', label: t('feedback.admin.status.all'), count: counts.all },
    { value: 'open', label: t('feedback.admin.status.open'), count: counts.open },
    { value: 'inProgress', label: t('feedback.admin.status.inProgress'), count: counts.inProgress },
    { value: 'resolved', label: t('feedback.admin.status.resolved'), count: counts.resolved },
    { value: 'closed', label: t('feedback.admin.status.closed'), count: counts.closed },
    { value: 'archived', label: t('feedback.admin.status.archived'), count: counts.archived },
  ];

  return (
    <div className="space-y-4">
      <Tabs value={status} onValueChange={onStatusChange}>
        <TabsList>
          {statusTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label} ({tab.count})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex gap-4">
        <Select value={type} onValueChange={onTypeChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t('feedback.admin.type.placeholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('feedback.admin.type.all')}</SelectItem>
            {FEEDBACK_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {t(opt.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder={t('feedback.admin.searchPlaceholder')}
          aria-label={t('feedback.admin.searchLabel')}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="max-w-sm flex-1"
        />
      </div>
    </div>
  );
}
