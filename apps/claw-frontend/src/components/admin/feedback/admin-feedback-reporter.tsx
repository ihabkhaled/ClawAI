'use client';

import type { ReactElement } from 'react';

import type { AdminFeedbackReporterProps } from '@/types/feedback-props.types';

// Older tickets have no name snapshot, so the name line is left out. The email
// is plain text that breaks anywhere, so a long address cannot widen a 390px card.
export function AdminFeedbackReporter({ name, email }: AdminFeedbackReporterProps): ReactElement {
  const hasName = name !== undefined && name !== null && name.trim().length > 0;
  return (
    <div className="min-w-0">
      {hasName ? (
        <p className="text-sm font-medium break-words" data-testid="feedback-reporter-name">
          {name}
        </p>
      ) : null}
      <p
        className="text-muted-foreground text-xs break-words select-text"
        data-testid="feedback-reporter-email"
      >
        {email}
      </p>
    </div>
  );
}
