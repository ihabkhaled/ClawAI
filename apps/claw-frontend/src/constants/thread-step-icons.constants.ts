import type { ThreadGenerationStepOutcome } from '@claw/shared-types';
import {
  ArrowRightLeft,
  CheckCircle2,
  Loader2,
  MinusCircle,
  RotateCw,
  XCircle,
  type LucideIcon,
} from 'lucide-react';

/** One icon per step outcome, so state is never carried by colour alone. */
export const THREAD_STEP_OUTCOME_ICONS: Readonly<Record<ThreadGenerationStepOutcome, LucideIcon>> =
  {
    STARTED: Loader2,
    SUCCEEDED: CheckCircle2,
    FAILED: XCircle,
    RETRY: RotateCw,
    FALLBACK: ArrowRightLeft,
    SKIPPED: MinusCircle,
  };
