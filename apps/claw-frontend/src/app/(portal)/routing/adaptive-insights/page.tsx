'use client';

import { AdaptiveModeChart } from '@/components/routing/adaptive-mode-chart';
import { AdaptiveProviderTable } from '@/components/routing/adaptive-provider-table';
import { AdaptiveStatsCard } from '@/components/routing/adaptive-stats-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ADAPTIVE_LEARNING_WINDOW_OPTIONS } from '@/constants';
import { useAdaptiveLearningPage } from '@/hooks/routing/use-adaptive-learning-page';

export default function AdaptiveInsightsPage(): React.ReactElement {
  const { t, insights, isLoading, isError, windowDays, setWindowDays } = useAdaptiveLearningPage();

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold">{t('adaptiveLearning.title')}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t('adaptiveLearning.description')}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm">{t('adaptiveLearning.windowDays')}</span>
        <Select
          value={String(windowDays)}
          onValueChange={(v) => {
            setWindowDays(Number(v));
          }}
        >
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ADAPTIVE_LEARNING_WINDOW_OPTIONS.map((d) => (
              <SelectItem key={d} value={String(d)}>
                {d} {t('adaptiveLearning.days')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        {header}
        <div className="text-muted-foreground flex items-center justify-center py-16">
          {t('adaptiveLearning.loading')}
        </div>
      </div>
    );
  }

  if (isError || !insights) {
    return (
      <div className="space-y-6 p-6">
        {header}
        <div className="text-destructive flex items-center justify-center py-16">
          {t('adaptiveLearning.error')}
        </div>
      </div>
    );
  }

  if (insights.totalDecisions === 0) {
    return (
      <div className="space-y-6 p-6">
        {header}
        <div className="text-muted-foreground flex items-center justify-center py-16">
          {t('adaptiveLearning.noData')}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {header}
      <AdaptiveStatsCard insights={insights} t={t} />
      <AdaptiveProviderTable providerInsights={insights.providerInsights} t={t} />
      <AdaptiveModeChart modeInsights={insights.modeInsights} t={t} />
    </div>
  );
}
