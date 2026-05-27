'use client';

import { DecisionDetailSections } from '@/components/routing/decision-detail-sections';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useRoutingDecisionDetail } from '@/hooks/routing/use-routing-decision-detail';
import { useTranslation } from '@/lib/i18n';
import type { DecisionDetailDrawerProps } from '@/types';

export function DecisionDetailDrawer({
  decisionId,
  open,
  onOpenChange,
}: DecisionDetailDrawerProps): React.ReactElement | null {
  const { t } = useTranslation();
  const { decision, isLoading, isError } = useRoutingDecisionDetail(
    decisionId,
    open && decisionId !== null,
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-3xl"
      >
        <SheetHeader>
          <SheetTitle>{t('decisionDetail.title')}</SheetTitle>
          <SheetDescription>{t('decisionDetail.description')}</SheetDescription>
        </SheetHeader>

        <div className="mt-4">
          {decisionId === null ? (
            <p className="text-sm text-muted-foreground">
              {t('decisionDetail.noDecisionId')}
            </p>
          ) : null}
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t('decisionDetail.loading')}</p>
          ) : null}
          {isError ? (
            <p className="text-sm text-destructive">{t('decisionDetail.loadFailed')}</p>
          ) : null}
          {!isLoading && !isError && decision !== null ? (
            <DecisionDetailSections decision={decision} />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
