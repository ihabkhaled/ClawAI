import type * as React from 'react';

import {
  EMPTY_STATE_DESCRIPTION_CLASSES,
  EMPTY_STATE_ICON_CLASSES,
  EMPTY_STATE_ICON_WRAP_CLASSES,
  EMPTY_STATE_TITLE_CLASSES,
  EMPTY_STATE_VARIANT_CLASSES,
} from '@/constants/empty-state.constants';
import { EmptyStateVariant } from '@/enums/empty-state-variant.enum';
import { cn } from '@/lib/utils';
import type { EmptyStateProps } from '@/types';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = EmptyStateVariant.Default,
}: EmptyStateProps): React.ReactElement {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        EMPTY_STATE_VARIANT_CLASSES[variant],
      )}
    >
      <div
        className={cn(
          'mx-auto flex items-center justify-center bg-muted',
          EMPTY_STATE_ICON_WRAP_CLASSES[variant],
        )}
      >
        <Icon
          className={cn('text-muted-foreground', EMPTY_STATE_ICON_CLASSES[variant])}
          aria-hidden="true"
        />
      </div>
      <h3 className={EMPTY_STATE_TITLE_CLASSES[variant]}>{title}</h3>
      {description ? (
        <p className={EMPTY_STATE_DESCRIPTION_CLASSES[variant]}>{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
