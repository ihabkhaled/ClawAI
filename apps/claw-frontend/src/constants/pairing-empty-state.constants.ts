import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { PairingEmptyStateKind } from '../enums';

export const PAIRING_EMPTY_STATE_ICONS: Record<PairingEmptyStateKind, LucideIcon> = {
  [PairingEmptyStateKind.EXPIRED]: AlertTriangle,
  [PairingEmptyStateKind.DENIED]: XCircle,
  [PairingEmptyStateKind.ACCOUNT_MISMATCH]: AlertTriangle,
  [PairingEmptyStateKind.SUCCESS]: CheckCircle2,
};

export const PAIRING_EMPTY_STATE_KEYS: Record<
  PairingEmptyStateKind,
  { title: string; body: string }
> = {
  [PairingEmptyStateKind.EXPIRED]: {
    title: 'agent.connect.expiredTitle',
    body: 'agent.connect.expiredBody',
  },
  [PairingEmptyStateKind.DENIED]: {
    title: 'agent.connect.deniedTitle',
    body: 'agent.connect.deniedBody',
  },
  [PairingEmptyStateKind.ACCOUNT_MISMATCH]: {
    title: 'agent.connect.accountMismatchTitle',
    body: 'agent.connect.accountMismatchBody',
  },
  [PairingEmptyStateKind.SUCCESS]: {
    title: 'agent.connect.successTitle',
    body: 'agent.connect.successBody',
  },
};
