import type { ReactElement } from 'react';

import { EmptyState } from '@/components/common/empty-state';
import {
  PAIRING_EMPTY_STATE_ICONS,
  PAIRING_EMPTY_STATE_KEYS,
} from '@/constants/pairing-empty-state.constants';
import type { PairingEmptyStateProps } from '@/types/device-component.types';

export function PairingEmptyState({ t, kind }: PairingEmptyStateProps): ReactElement {
  const Icon = PAIRING_EMPTY_STATE_ICONS[kind];
  const keys = PAIRING_EMPTY_STATE_KEYS[kind];
  return <EmptyState icon={Icon} title={t(keys.title)} description={t(keys.body)} />;
}
