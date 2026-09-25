import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SkippedProvidersCard } from '@/components/connectors/skipped-providers-card';
import type { SkippedProviderRow } from '@/types/provider-breaker.types';

const t = (key: string, params?: Record<string, string | number>): string =>
  params?.provider === undefined ? key : `${key}:${String(params.provider)}`;

const ROW: SkippedProviderRow = {
  provider: 'OPENAI',
  connectorLabel: 'OpenAI prod',
  reasonLabel: 'Account out of credit',
  skippedUntilLabel: '9/25/2026, 1:10:00 PM',
  probing: true,
};

const baseProps = {
  rows: [ROW],
  isLoading: false,
  isError: false,
  isPartial: false,
  clearingProvider: null,
  onClear: vi.fn(),
  t,
};

describe('SkippedProvidersCard', () => {
  it('renders each skipped provider with connectors, reason, skipped-until and probing', () => {
    render(<SkippedProvidersCard {...baseProps} />);
    expect(screen.getByText('OPENAI')).toBeTruthy();
    expect(screen.getByText('OpenAI prod')).toBeTruthy();
    expect(screen.getByText('Account out of credit')).toBeTruthy();
    expect(screen.getByText('9/25/2026, 1:10:00 PM')).toBeTruthy();
    expect(screen.getByText('skippedProviders.probing')).toBeTruthy();
  });

  it('Clear calls back with the provider', () => {
    const onClear = vi.fn();
    render(<SkippedProvidersCard {...baseProps} onClear={onClear} />);
    fireEvent.click(screen.getByRole('button', { name: 'skippedProviders.clearProvider:OPENAI' }));
    expect(onClear).toHaveBeenCalledWith('OPENAI');
  });

  it('disables Clear while one is in flight and labels the one clearing', () => {
    render(<SkippedProvidersCard {...baseProps} clearingProvider="OPENAI" />);
    const button = screen.getByRole('button', { name: 'skippedProviders.clearProvider:OPENAI' });
    expect(button.hasAttribute('disabled')).toBe(true);
    expect(button.textContent).toBe('skippedProviders.clearing');
  });

  it('shows the empty state, the error, and the partial warning', () => {
    const { rerender } = render(<SkippedProvidersCard {...baseProps} rows={[]} />);
    expect(screen.getByText('skippedProviders.empty')).toBeTruthy();
    rerender(<SkippedProvidersCard {...baseProps} rows={[]} isError />);
    expect(screen.getByRole('alert').textContent).toBe('skippedProviders.error');
    rerender(<SkippedProvidersCard {...baseProps} isPartial />);
    expect(screen.getByRole('status').textContent).toBe('skippedProviders.partial');
  });
});
