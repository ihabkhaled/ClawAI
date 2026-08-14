import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RuntimeProbeCard } from '@/components/admin/runtime-progress';

vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('RuntimeProbeCard', () => {
  it('renders a disabled service state without probing controls or empty diagnostics', () => {
    render(
      <RuntimeProbeCard
        titleKey="runtimeProgress.diagnostics.ollamaTitle"
        report={undefined}
        isLoading={false}
        error={null}
        isDisabled
        onRefresh={vi.fn()}
      />,
    );

    expect(screen.getByText('runtimeProgress.diagnostics.serviceDisabled')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(
      screen.queryByText('runtimeProgress.diagnostics.capabilitiesTitle'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/runtimeProgress\.diagnostics\.modelsTitle/u),
    ).not.toBeInTheDocument();
  });
});
