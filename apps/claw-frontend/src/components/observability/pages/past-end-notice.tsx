import { Inbox } from 'lucide-react';
import type { ReactElement } from 'react';

import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';
import { EmptyStateVariant } from '@/enums/empty-state-variant.enum';
import type { PastEndNoticeProps } from '@/types/observability-pages.types';

/** A page number beyond the last page: say so, and offer the way back to page 1. */
export function PastEndNotice({ onBack, t }: PastEndNoticeProps): ReactElement {
  return (
    <EmptyState
      icon={Inbox}
      title={t('observabilityPages.pastEndNote')}
      variant={EmptyStateVariant.Compact}
      action={
        <Button type="button" variant="outline" size="sm" onClick={onBack}>
          {t('observabilityPages.backToFirstPage')}
        </Button>
      }
    />
  );
}
