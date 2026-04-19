'use client';

import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';

import type { RunStatusIconProps } from '@/types';

export function RunStatusIcon({ status }: RunStatusIconProps): React.ReactElement {
  if (status === 'RUNNING' || status === 'PENDING') {
    return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
  }
  if (status === 'COMPLETED') {
    return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  }
  if (status === 'FAILED' || status === 'CANCELLED') {
    return <XCircle className="h-4 w-4 text-destructive" />;
  }
  return <Circle className="h-4 w-4" />;
}
