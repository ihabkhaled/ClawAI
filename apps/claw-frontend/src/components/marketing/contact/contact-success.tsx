'use client';

import { CheckCircle2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { ContactSuccessProps } from '@/types/component.types';

// Post-submit confirmation shown in place of the form. Kept as its own file
// per the no-inline-subcomponent rule.
export function ContactSuccess({
  title,
  body,
  resetLabel,
  onReset,
}: ContactSuccessProps): React.ReactElement {
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <CheckCircle2 className="text-primary h-12 w-12" aria-hidden="true" />
      <h2 className="text-foreground text-xl font-semibold">{title}</h2>
      <p className="text-muted-foreground max-w-md text-sm">{body}</p>
      <Button type="button" variant="outline" onClick={onReset}>
        {resetLabel}
      </Button>
    </div>
  );
}
