import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RouterModelRow } from '@/components/routing/router-model-row';
import {
  CostClass,
  PrivacyClass,
  QualityTier,
  RouterModelLifecycle,
} from '@/enums/router-models.enum';
import type { RouterModelRowDisplay } from '@/types/use-router-models-page.types';

vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const row: RouterModelRowDisplay = {
  id: 'model-1',
  provider: 'provider',
  modelKey: `provider/${'long-model-key'.repeat(20)}`,
  displayName: 'Model',
  isLocal: false,
  isRouterOnly: false,
  lifecycle: RouterModelLifecycle.ACTIVE,
  qualityTier: QualityTier.A,
  costClass: CostClass.STANDARD,
  costConfidenceLabel: 'exact',
  privacy: PrivacyClass.CLOUD_PERMITTED,
  latencyP95Ms: 250,
};

describe('RouterModelRow mobile layout', () => {
  it('renders all seven values in a labeled, breakable mobile card', () => {
    const { container } = render(
      <table>
        <tbody>
          <RouterModelRow row={row} onSelect={vi.fn()} />
        </tbody>
      </table>,
    );

    expect(container.querySelector('tr')).toHaveClass('touch:block');
    expect(container.querySelectorAll('td')).toHaveLength(7);
    expect(container.querySelector('td')).toHaveAttribute(
      'data-label',
      'routing.models.columnModelKey',
    );
    expect(container.querySelector('td span.text-xs')).toHaveClass('break-all');
  });
});
