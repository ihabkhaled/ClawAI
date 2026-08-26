'use client';

import type { ReactElement } from 'react';

import type { AdminFeedbackDetailSectionProps } from '@/types/feedback-props.types';

// One titled block inside the ticket dialog. The sections used to be separated
// by nothing but a top border, so every heading read at the same weight as the
// ticket title and the dialog looked like one long unbroken column.
export function AdminFeedbackDetailSection({
  title,
  children,
}: AdminFeedbackDetailSectionProps): ReactElement {
  return (
    <section className="border-border/60 bg-muted/20 rounded-lg border p-4">
      <h3 className="text-muted-foreground mb-3 text-xs font-semibold tracking-wider uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}
