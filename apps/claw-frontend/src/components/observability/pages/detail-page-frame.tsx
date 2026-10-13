import { ArrowLeft, MousePointerClick } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';

import { EmptyState } from '@/components/common/empty-state';
import { QueryState } from '@/components/observability/explorer/query-state';
import { EntityDetailView } from '@/components/observability/pages/entity-detail-view';
import { DETAIL_CHOICE_KEYS } from '@/constants/observability-pages.constants';
import { EmptyStateVariant } from '@/enums/empty-state-variant.enum';
import { useObservabilityScope } from '@/hooks/observability/use-observability-scope';
import type { DetailFrameProps } from '@/types/observability-pages.types';
import { missingDetailTarget } from '@/utilities/observability-pages.utility';
import { withQuery } from '@/utilities/observability-url.utility';

/**
 * Back link, loading / error / empty states and the detail itself, for a provider or a model.
 * A link that names no provider or model gets a "choose one" state, not a blank page.
 */
export function DetailPageFrame({
  detail,
  isLoading,
  isError,
  onRetry,
  provider,
  model,
  backHref,
  backLabel,
  t,
}: DetailFrameProps): ReactElement {
  const { sharedQuery, openUser } = useObservabilityScope();
  const missing = missingDetailTarget(provider, model);
  const choice = missing === null ? null : DETAIL_CHOICE_KEYS[missing];
  return (
    <div className="min-w-0 space-y-6">
      <Link
        href={withQuery(backHref, sharedQuery)}
        className="text-primary focus-visible:ring-ring inline-flex min-h-11 items-center gap-1 rounded-sm text-sm font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
        {backLabel}
      </Link>
      {choice === null ? (
        <QueryState
          isLoading={isLoading}
          isError={isError}
          isEmpty={detail !== null && detail.entity.metrics.requests === 0}
          onRetry={onRetry}
          t={t}
        >
          {detail === null ? null : (
            <EntityDetailView
              detail={detail}
              provider={provider}
              model={model}
              sharedQuery={sharedQuery}
              onOpenUser={openUser}
              t={t}
            />
          )}
        </QueryState>
      ) : (
        <EmptyState
          icon={MousePointerClick}
          title={t(choice.titleKey)}
          description={t(choice.hintKey)}
          variant={EmptyStateVariant.Compact}
        />
      )}
    </div>
  );
}
