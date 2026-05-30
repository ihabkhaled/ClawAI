import { AlertCircle, AlertTriangle, CheckCircle2, HelpCircle, KeyRound, XCircle } from 'lucide-react';

import { RuntimeProbeStatus } from '@/enums';
import type { RuntimeProbeStatusIconProps } from '@/types';

// Small icon + colour mapping for a runtime probe status. Kept separate so it
// can be reused in cards, badges, and any future inline lists without
// duplicating the colour ↔ status table.
export function RuntimeProbeStatusIcon({ status }: RuntimeProbeStatusIconProps): React.ReactElement {
  if (status === RuntimeProbeStatus.REACHABLE) {
    return <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />;
  }
  if (status === RuntimeProbeStatus.DEGRADED) {
    return <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />;
  }
  if (status === RuntimeProbeStatus.UNREACHABLE) {
    return <XCircle className="h-4 w-4 text-destructive" aria-hidden="true" />;
  }
  if (status === RuntimeProbeStatus.BINARY_MISSING) {
    return <AlertCircle className="h-4 w-4 text-destructive" aria-hidden="true" />;
  }
  if (status === RuntimeProbeStatus.AUTH_REQUIRED) {
    return <KeyRound className="h-4 w-4 text-amber-500" aria-hidden="true" />;
  }
  if (status === RuntimeProbeStatus.NOT_CONFIGURED) {
    return <HelpCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />;
  }
  return <HelpCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />;
}
