import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ConsumptionPage } from '@/components/observability/pages/consumption-page';
import { ModelsPage } from '@/components/observability/pages/models-page';
import { PlansPage } from '@/components/observability/pages/plans-page';
import { ProvidersPage } from '@/components/observability/pages/providers-page';
import { SurfacesPage } from '@/components/observability/pages/surfaces-page';
import { TracingPage } from '@/components/observability/pages/tracing-page';
import { UsersPage } from '@/components/observability/pages/users-page';

import { scopeContext } from './pages-fixtures';
import { renderInScope } from './pages-test-utils';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' }),
}));
vi.mock('@/components/observability/pages/observability-list-page', () => ({
  ObservabilityListPage: ({
    kind,
    title,
    searchLabel,
    note,
  }: {
    kind: string;
    title: string;
    searchLabel: string;
    note: string;
  }) => (
    <div data-testid="list-page" data-kind={kind}>
      {title}|{searchLabel}|{note}
    </div>
  ),
}));
vi.mock('@/components/observability/explorer/consumption-tab', () => ({
  ConsumptionTab: ({ scope }: { scope: { buildParams: () => unknown } }) => (
    <div data-testid="consumption-tab">{JSON.stringify(scope.buildParams())}</div>
  ),
}));
vi.mock('@/components/observability/explorer/tracing-tab', () => ({
  TracingTab: ({ scope }: { scope: { buildParams: () => unknown } }) => (
    <div data-testid="tracing-tab">{JSON.stringify(scope.buildParams())}</div>
  ),
}));

describe('list pages', () => {
  it.each([
    [UsersPage, 'users', 'Users'],
    [ProvidersPage, 'providers', 'Providers'],
    [ModelsPage, 'models', 'Models'],
    [PlansPage, 'plans', 'Plans'],
    [SurfacesPage, 'workflows', 'Surfaces'],
  ] as const)('%o lists every %s with its own title, search label and note', (Page, kind, name) => {
    render(<Page />);
    const node = screen.getByTestId('list-page');
    expect(node).toHaveAttribute('data-kind', kind);
    expect(node).toHaveTextContent(`observabilityPages.title${name}`);
    expect(node).toHaveTextContent(`observabilityPages.search${name}`);
    expect(node).toHaveTextContent(`observabilityPages.note${name}`);
  });
});

describe('moved sections', () => {
  it('gives the consumption and tracing pages the shared period and filters', () => {
    const value = scopeContext('period=30d&plan=NONE');
    for (const [Page, id] of [
      [ConsumptionPage, 'consumption-tab'],
      [TracingPage, 'tracing-tab'],
    ] as const) {
      const { unmount } = renderInScope(<Page />, value);
      expect(screen.getByTestId(id)).toHaveTextContent('{"days":"30","plan":"NONE"}');
      unmount();
    }
  });
});
