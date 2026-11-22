'use client';

import type { ReactElement } from 'react';

import { StatusBadge } from '@/components/common/status-badge';
import {
  MODEL_VISIBILITY_GATE_LABEL_KEYS,
  MODEL_VISIBILITY_STATUS_BADGE_CLASSES,
  MODEL_VISIBILITY_STATUS_LABEL_KEYS,
} from '@/constants/model-visibility.constants';
import type { ModelVisibilityGateListProps } from '@/types/model-visibility.types';

/** Every picker check in order, with its verdict and the backend's evidence. */
export function ModelVisibilityGateList({ gates, t }: ModelVisibilityGateListProps): ReactElement {
  return (
    <ol className="flex flex-col gap-2" data-testid="model-visibility-gates">
      {gates.map((gate) => (
        <li
          key={gate.gate}
          className="flex min-w-0 items-start justify-between gap-3 rounded-md border p-2"
          data-gate={gate.gate}
          data-status={gate.status}
        >
          <div className="min-w-0">
            <p className="text-sm font-medium">{t(MODEL_VISIBILITY_GATE_LABEL_KEYS[gate.gate])}</p>
            <p className="text-muted-foreground text-xs break-words">
              <bdi>{gate.detail}</bdi>
            </p>
          </div>
          <StatusBadge
            status={t(MODEL_VISIBILITY_STATUS_LABEL_KEYS[gate.status])}
            className={MODEL_VISIBILITY_STATUS_BADGE_CLASSES[gate.status]}
          />
        </li>
      ))}
    </ol>
  );
}
