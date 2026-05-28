'use client';

import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useRouteErrorBoundary } from '@/hooks/common/use-route-error-boundary';
import type { RouteErrorBoundaryProps } from '@/types';

// Reusable fallback rendered by every segment-level error.tsx. Logic
// (logging + reset-on-navigation) lives in useRouteErrorBoundary so this stays
// render-only.
export function RouteErrorBoundary(props: RouteErrorBoundaryProps): React.ReactElement {
  const { title, description, retryLabel, onRetry } = useRouteErrorBoundary(props);

  return (
    <div className="flex min-h-[400px] flex-1 flex-col items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 p-8 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      <Button variant="outline" className="mt-6" onClick={onRetry}>
        {retryLabel}
      </Button>
    </div>
  );
}
