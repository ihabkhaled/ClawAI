'use client';

import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

import { WhyThisModelRow } from '@/components/chat/why-this-model-row';
import { DecisionDetailDrawer } from '@/components/routing/decision-detail-drawer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useWhyThisModelPanel } from '@/hooks/chat/use-why-this-model-panel';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { WhyThisModelPanelProps } from '@/types';

export function WhyThisModelPanel({ message }: WhyThisModelPanelProps): React.ReactElement | null {
  const { t } = useTranslation();
  const { isExpanded, toggleExpanded, isDrawerOpen, openDrawer, setDrawerOpen } =
    useWhyThisModelPanel();

  const metadata = message.metadata as Record<string, unknown> | null;
  const routeRoadmap = metadata?.['routeRoadmap'] as
    | {
        finalProvider?: string | null;
        finalModel?: string | null;
        selectedWorkflow?: string | null;
        workflow?: string | null;
        confidence?: number | null;
        costClass?: string | null;
        latencyClass?: string | null;
        judgeUsed?: boolean | null;
        usedFallback?: boolean | null;
        reasonSummary?: string | null;
      }
    | undefined;

  if (routeRoadmap === undefined && message.provider === null && message.model === null) {
    return null;
  }

  const selectedProvider = routeRoadmap?.finalProvider ?? message.provider ?? null;
  const selectedModel = routeRoadmap?.finalModel ?? message.model ?? null;
  const selectedWorkflow = routeRoadmap?.selectedWorkflow ?? routeRoadmap?.workflow ?? null;
  const confidenceValue =
    typeof routeRoadmap?.confidence === 'number' ? routeRoadmap.confidence : null;
  const confidencePct = confidenceValue === null ? null : Math.round(confidenceValue * 100);
  const costClass = typeof routeRoadmap?.costClass === 'string' ? routeRoadmap.costClass : null;
  const latencyClass =
    typeof routeRoadmap?.latencyClass === 'string' ? routeRoadmap.latencyClass : null;
  const usedFallback = Boolean(routeRoadmap?.usedFallback ?? message.usedFallback);
  const judgeUsed = Boolean(routeRoadmap?.judgeUsed);
  const reasonSummary =
    typeof routeRoadmap?.reasonSummary === 'string' ? routeRoadmap.reasonSummary : null;
  const memoryCount = typeof metadata?.['memoryCount'] === 'number' ? metadata['memoryCount'] : 0;
  const packCount =
    typeof metadata?.['contextPackCount'] === 'number' ? metadata['contextPackCount'] : 0;
  const decisionId =
    typeof metadata?.['routingDecisionId'] === 'string' ? metadata['routingDecisionId'] : null;

  return (
    <div className="mt-1 w-full">
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleExpanded}
        className="text-muted-foreground hover:text-foreground h-7 gap-1.5 px-2 text-xs"
        aria-label={t('whyThisModel.toggle')}
      >
        <Sparkles className="h-3 w-3" />
        {t('whyThisModel.toggle')}
        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </Button>

      {isExpanded ? (
        <div className="bg-card mt-1 rounded-md border p-3 text-xs">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
            <WhyThisModelRow label={t('whyThisModel.selectedModel')}>
              <span className="font-medium">
                {selectedProvider ?? '—'} / {selectedModel ?? '—'}
              </span>
            </WhyThisModelRow>
            <WhyThisModelRow label={t('whyThisModel.workflow')}>
              <span>{selectedWorkflow ?? '—'}</span>
            </WhyThisModelRow>
            <WhyThisModelRow label={t('whyThisModel.confidence')}>
              <span>{confidencePct === null ? '—' : `${String(confidencePct)}%`}</span>
            </WhyThisModelRow>
            <WhyThisModelRow label={t('whyThisModel.costClass')}>
              <Badge variant="outline" className="touch:text-xs text-[10px]">
                {costClass ?? t('common.unknown')}
              </Badge>
            </WhyThisModelRow>
            <WhyThisModelRow label={t('whyThisModel.latencyClass')}>
              <Badge variant="outline" className="touch:text-xs text-[10px]">
                {latencyClass ?? t('common.unknown')}
              </Badge>
            </WhyThisModelRow>
            <WhyThisModelRow label={t('whyThisModel.routingMode')}>
              <span>{message.routingMode ?? '—'}</span>
            </WhyThisModelRow>
            <WhyThisModelRow label={t('whyThisModel.fallbackUsed')}>
              <span className={cn(usedFallback ? 'text-warning' : '')}>
                {usedFallback ? t('common.yes') : t('common.no')}
              </span>
            </WhyThisModelRow>
            <WhyThisModelRow label={t('whyThisModel.judgeUsed')}>
              <span>{judgeUsed ? t('common.yes') : t('common.no')}</span>
            </WhyThisModelRow>
            <WhyThisModelRow label={t('whyThisModel.memoriesUsed')}>
              <span>{String(memoryCount)}</span>
            </WhyThisModelRow>
            <WhyThisModelRow label={t('whyThisModel.contextPacks')}>
              <span>{String(packCount)}</span>
            </WhyThisModelRow>
          </div>

          {reasonSummary !== null && reasonSummary.length > 0 ? (
            <div className="border-border/60 bg-muted/40 mt-2 rounded border p-2">
              <p className="touch:text-xs text-muted-foreground text-[11px]">
                {t('whyThisModel.reasonSummary')}
              </p>
              <p className="mt-1">{reasonSummary}</p>
            </div>
          ) : null}

          <div className="mt-2 flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={openDrawer}
              disabled={decisionId === null}
              className="h-7 text-xs"
            >
              {t('whyThisModel.moreDetails')}
            </Button>
          </div>
        </div>
      ) : null}

      {isDrawerOpen ? (
        <DecisionDetailDrawer
          decisionId={decisionId}
          open={isDrawerOpen}
          onOpenChange={setDrawerOpen}
        />
      ) : null}
    </div>
  );
}
