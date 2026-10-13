import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ObservabilityFilterBar } from '@/components/observability/pages/observability-filter-bar';
import { ObservabilityHub } from '@/components/observability/pages/observability-hub';
import { ObservabilityListPage } from '@/components/observability/pages/observability-list-page';
import { ObservabilityNav } from '@/components/observability/pages/observability-nav';
import { ProviderDetailPage } from '@/components/observability/pages/provider-detail-page';
import { useEntityAuditLatency } from '@/hooks/observability/use-entity-audit-latency';
import { useObservabilityEntityDetail } from '@/hooks/observability/use-observability-entity-detail';
import { useObservabilityList } from '@/hooks/observability/use-observability-list';
import { useObservabilityOverview } from '@/hooks/observability/use-observability-overview';
import { useObservabilityPreview } from '@/hooks/observability/use-observability-preview';
import { useUsersCsvExport } from '@/hooks/observability/use-users-csv-export';

import { tStub as t } from '../../explorer/__tests__/explorer-fixtures';

import {
  obsDetail,
  obsOverview,
  obsPage,
  obsRow,
  scopeContext,
  userObsRow,
} from './pages-fixtures';
import { renderInScope } from './pages-test-utils';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' }),
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/observability' }));
vi.mock('@/hooks/observability/use-observability-list');
vi.mock('@/hooks/observability/use-users-csv-export');
vi.mock('@/hooks/observability/use-observability-overview');
vi.mock('@/hooks/observability/use-observability-preview');
vi.mock('@/hooks/observability/use-observability-entity-detail');
vi.mock('@/hooks/observability/use-entity-audit-latency');
vi.mock('@/hooks/observability/use-service-status', () => ({ useServiceStatus: () => ({}) }));
vi.mock('@/components/observability/service-status-section', () => ({
  ServiceStatusSection: () => <section aria-label="service status" />,
}));

function expectEveryControlNamed(): void {
  for (const role of ['button', 'link', 'combobox', 'textbox', 'searchbox'] as const) {
    for (const element of screen.queryAllByRole(role)) {
      expect(element, `${role} ${element.outerHTML.slice(0, 80)}`).toHaveAccessibleName();
    }
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useObservabilityList).mockReturnValue({
    controls: {
      searchDraft: '',
      search: '',
      sort: 'lastSeen',
      order: 'desc',
      limit: 20,
      page: 1,
      setSearchDraft: vi.fn(),
      toggleSort: vi.fn(),
      setLimit: vi.fn(),
      setPage: vi.fn(),
      goToFirstPage: vi.fn(),
    },
    result: obsPage([userObsRow()], { total: 40, pageCount: 2 }),
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  });
  vi.mocked(useUsersCsvExport).mockReturnValue({
    exportCsv: vi.fn(() => Promise.resolve()),
    isExporting: false,
    isError: false,
    truncated: false,
  });
  vi.mocked(useObservabilityOverview).mockReturnValue({
    top: 10,
    setTop: vi.fn(),
    overview: obsOverview(),
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
  vi.mocked(useObservabilityPreview).mockReturnValue({
    rows: [obsRow()],
    total: 1,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
  vi.mocked(useObservabilityEntityDetail).mockReturnValue({
    detail: obsDetail(),
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
  vi.mocked(useEntityAuditLatency).mockReturnValue({
    match: null,
    overall: null,
    clamped: false,
    isLoading: false,
    isError: false,
  });
});

describe('Observability pages: accessible names', () => {
  it('names every control in the navigation and the filter bar', () => {
    render(
      <>
        <ObservabilityNav canViewSystem sharedQuery="" t={t} />
        <ObservabilityFilterBar scope={scopeContext('period=custom&plan=NONE')} t={t} />
      </>,
    );
    expectEveryControlNamed();
    expect(screen.getByRole('navigation')).toHaveAccessibleName('observabilityPages.navLabel');
  });

  it('names every control on a full list page, and labels the table headers', () => {
    renderInScope(
      <ObservabilityListPage kind="users" title="Users" searchLabel="Search" note="n" t={t} />,
    );
    expectEveryControlNamed();
    expect(screen.getAllByRole('columnheader').length).toBeGreaterThan(5);
    expect(screen.getByRole('searchbox')).toHaveAccessibleName('Search');
  });

  it('names every control on the hub, and every chart has a text alternative', () => {
    renderInScope(<ObservabilityHub />, scopeContext('period=7d'));
    expectEveryControlNamed();
    for (const chart of screen.getAllByRole('img')) {
      expect(chart).toHaveAccessibleName();
    }
  });

  it('names every control on a detail page', () => {
    renderInScope(<ProviderDetailPage provider="GEMINI" />, scopeContext('period=7d'));
    expectEveryControlNamed();
    for (const chart of screen.getAllByRole('img')) {
      expect(chart).toHaveAccessibleName();
    }
  });
});
