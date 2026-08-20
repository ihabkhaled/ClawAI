import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ResearchProviderRow } from '@/components/research/research-provider-row';
import { ResearchProviderKind } from '@/enums/research-provider-kind.enum';
import { ResearchProviderStatus } from '@/enums/research-provider-status.enum';
import type { SanitizedResearchProvider } from '@/types';

vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const provider: SanitizedResearchProvider = {
  id: 'provider-1',
  kind: ResearchProviderKind.GENERIC_HTTP,
  name: 'Provider',
  description: null,
  baseUrl: `https://example.com/${'long'.repeat(30)}`,
  hasSecret: true,
  secretVersion: 1,
  enabled: true,
  priority: 1,
  status: ResearchProviderStatus.ACTIVE,
  publicConfig: {},
  allowlistDomains: [],
  blocklistDomains: [],
  timeoutMs: 5_000,
  lastValidatedAt: null,
  validationError: null,
  createdAt: '2026-08-20T00:00:00.000Z',
  updatedAt: '2026-08-20T00:00:00.000Z',
};

describe('ResearchProviderRow mobile layout', () => {
  it('renders as a labeled card with a wrapping URL and actions', () => {
    const { container } = render(
      <table>
        <tbody>
          <ResearchProviderRow
            provider={provider}
            onTest={vi.fn()}
            onDelete={vi.fn()}
            isTestPending={false}
            isDeletePending={false}
          />
        </tbody>
      </table>,
    );

    expect(container.querySelector('tr')).toHaveClass('max-md:block');
    expect(container.querySelector('td')).toHaveAttribute(
      'data-label',
      'research.providers.col.name',
    );
    expect(container.querySelectorAll('td')[2]).toHaveClass('break-all');
    expect(container.querySelector('td:last-child > div')).toHaveClass('flex-wrap');
  });
});
