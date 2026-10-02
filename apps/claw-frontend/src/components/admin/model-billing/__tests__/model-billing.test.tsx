import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ModelBillingBadge } from '@/components/admin/model-billing/model-billing-badge';
import { ModelBillingCell } from '@/components/admin/model-billing/model-billing-cell';
import { ModelBillingFilterChips } from '@/components/admin/model-billing/model-billing-filter-chips';
import { ModelBillingHelp } from '@/components/admin/model-billing/model-billing-help';
import {
  ModelBillingFilter,
  ModelBillingMode,
  ModelBillingSource,
} from '@/enums/model-billing.enum';

const t = (key: string, params?: Record<string, string | number>): string =>
  params === undefined ? key : `${key}:${JSON.stringify(params)}`;

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t, locale: 'en', dir: 'ltr' }),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe('ModelBillingBadge', () => {
  it('labels a credit model and says where the answer came from', () => {
    render(
      <ModelBillingBadge
        billing={{
          mode: ModelBillingMode.CREDIT,
          source: ModelBillingSource.CONNECTOR,
          connectorId: 'c1',
        }}
        t={t}
      />,
    );

    const badge = screen.getByTestId('model-billing-badge');
    expect(badge).toHaveTextContent('adminModelCosts.billing.credit');
    expect(badge).toHaveAttribute('title', 'adminModelCosts.billing.sourceConnector');
  });

  it('labels a local model as included', () => {
    render(
      <ModelBillingBadge
        billing={{
          mode: ModelBillingMode.INCLUDED,
          source: ModelBillingSource.LOCAL_EXEMPT,
          connectorId: null,
        }}
        t={t}
      />,
    );

    const badge = screen.getByTestId('model-billing-badge');
    expect(badge).toHaveTextContent('adminModelCosts.billing.included');
    expect(badge).toHaveAttribute('title', 'adminModelCosts.billing.sourceLocal');
  });
});

describe('ModelBillingCell', () => {
  it('links to the connector whose switch decides the billing', () => {
    render(
      <ModelBillingCell
        billing={{
          mode: ModelBillingMode.CREDIT,
          source: ModelBillingSource.CONNECTOR,
          connectorId: 'c9',
        }}
        provider="OPENAI"
        t={t}
      />,
    );

    expect(
      screen.getByRole('link', {
        name: 'adminModelCosts.billing.editConnectorFor:{"provider":"OPENAI"}',
      }),
    ).toHaveAttribute('href', '/connectors/c9');
  });

  it('end-aligns in touch cards and start-aligns in the table', () => {
    const { container } = render(
      <ModelBillingCell
        billing={{
          mode: ModelBillingMode.CREDIT,
          source: ModelBillingSource.CONNECTOR,
          connectorId: 'c9',
        }}
        provider="OPENAI"
        t={t}
      />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveClass('justify-start', 'touch:justify-end');
    expect(root).not.toHaveClass('md:justify-start');
  });

  it('links to the connectors list when the provider has no connector yet', () => {
    render(
      <ModelBillingCell
        billing={{
          mode: ModelBillingMode.CREDIT,
          source: ModelBillingSource.PROVIDER_DEFAULT,
          connectorId: null,
        }}
        provider="ANTHROPIC"
        t={t}
      />,
    );

    expect(screen.getByRole('link')).toHaveAttribute('href', '/connectors');
  });
});

describe('ModelBillingFilterChips', () => {
  it('shows each option with its count and reports the choice', async () => {
    const onChange = vi.fn();
    render(
      <ModelBillingFilterChips
        value={ModelBillingFilter.ALL}
        counts={{ [ModelBillingMode.CREDIT]: 7, [ModelBillingMode.INCLUDED]: 3 }}
        totalCount={10}
        onChange={onChange}
        t={t}
      />,
    );

    const all = screen.getByRole('button', { name: /adminModelCosts\.filters\.all/ });
    expect(all).toHaveAttribute('aria-pressed', 'true');
    expect(all).toHaveTextContent('10');
    const credit = screen.getByRole('button', { name: /adminModelCosts\.billing\.credit/ });
    expect(credit).toHaveTextContent('7');

    await userEvent.click(credit);
    expect(onChange).toHaveBeenCalledWith(ModelBillingFilter.CREDIT);
  });
});

describe('ModelBillingHelp', () => {
  it('explains credit models and links to the connectors page', () => {
    render(<ModelBillingHelp isPolicyError={false} t={t} />);

    expect(screen.getByText('adminModelCosts.billing.help')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'adminModelCosts.billing.connectorsLink' }),
    ).toHaveAttribute('href', '/connectors');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('warns when the connector policy could not be loaded', () => {
    render(<ModelBillingHelp isPolicyError t={t} />);

    expect(screen.getByRole('alert')).toHaveTextContent('adminModelCosts.billing.policyError');
  });
});
