import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ServiceStatusSection } from '@/components/observability/service-status-section';
import { ComponentState, StatusComponent, UptimeWindow } from '@/enums';
import { Locale } from '@/enums/locale.enum';
import { LocaleProvider } from '@/lib/i18n';
import { ar } from '@/lib/i18n/locales/ar';
import { en } from '@/lib/i18n/locales/en';
import type { StatusPageResponse, TranslationDictionary } from '@/types';

vi.mock('next/navigation', () => ({
  usePathname: () => '/en/observability',
}));

const uptime = (day: number | null, coverage = 10_000) => [
  { window: UptimeWindow.DAY, uptimeBasisPoints: day, coverageBasisPoints: coverage },
  { window: UptimeWindow.WEEK, uptimeBasisPoints: 10_000, coverageBasisPoints: coverage },
  { window: UptimeWindow.MONTH, uptimeBasisPoints: 10_000, coverageBasisPoints: coverage },
];

const status: StatusPageResponse = {
  generatedAt: '2026-09-23T12:00:00.000Z',
  overall: ComponentState.DEGRADED,
  components: [
    { component: StatusComponent.CHAT, state: ComponentState.UP, uptime: uptime(9_965) },
    { component: StatusComponent.PAYMENTS, state: ComponentState.DOWN, uptime: uptime(8_000, 700) },
  ],
  incidents: [
    {
      component: StatusComponent.PAYMENTS,
      state: ComponentState.DOWN,
      startedAt: '2026-09-23T11:00:00.000Z',
      endedAt: null,
      durationSeconds: 3_600,
    },
    {
      component: StatusComponent.CHAT,
      state: ComponentState.DEGRADED,
      startedAt: '2026-09-22T08:00:00.000Z',
      endedAt: '2026-09-22T08:25:00.000Z',
      durationSeconds: 1_500,
    },
  ],
  historyAvailable: true,
  bucketSeconds: 300,
};

function renderSection(
  props: Partial<{ status: StatusPageResponse | undefined; isLoading: boolean; isError: boolean }>,
  locale: Locale = Locale.EN,
  dictionary: TranslationDictionary = en,
): void {
  render(
    <LocaleProvider initialLocale={locale} initialDictionary={dictionary}>
      <ServiceStatusSection status={status} isLoading={false} isError={false} {...props} />
    </LocaleProvider>,
  );
}

describe('ServiceStatusSection', () => {
  it('names every component and its state in words, not colour alone', () => {
    renderSection({});
    const section = screen.getByTestId('service-status-section');

    expect(within(section).getByText(en.observability.status.title)).toBeInTheDocument();
    const rows = within(section).getAllByRole('listitem');
    expect(
      within(rows[0] as HTMLElement).getByText(en.observability.status.components.chat),
    ).toBeInTheDocument();
    expect(
      within(rows[0] as HTMLElement).getByText(en.observability.status.states.up),
    ).toBeInTheDocument();
    expect(
      within(rows[1] as HTMLElement).getByText(en.observability.status.states.down),
    ).toBeInTheDocument();
    expect(within(section).getByText(en.observability.status.overallLabel)).toBeInTheDocument();
    expect(
      within(section).getAllByText(en.observability.status.states.degraded).length,
    ).toBeGreaterThan(0);
  });

  it('shows uptime as a two-decimal percentage and flags partial coverage', () => {
    renderSection({});

    expect(screen.getByText('99.65%')).toBeInTheDocument();
    expect(screen.getByText('80.00%')).toBeInTheDocument();
    expect(screen.getAllByText('Measured for 7% of this period').length).toBe(3);
  });

  it('lists incidents with their start and whether they are still open', () => {
    renderSection({});

    expect(screen.getByText(en.observability.status.incidentsTitle)).toBeInTheDocument();
    expect(screen.getByText('Ongoing for 1 hr')).toBeInTheDocument();
    expect(screen.getByText('Lasted 25 min')).toBeInTheDocument();
    expect(document.querySelectorAll('time[datetime="2026-09-23T11:00:00.000Z"]')).toHaveLength(1);
  });

  it('says so when there have been no incidents', () => {
    renderSection({ status: { ...status, incidents: [] } });
    expect(screen.getByText(en.observability.status.noIncidents)).toBeInTheDocument();
  });

  it('keeps the live state but explains a missing history', () => {
    renderSection({
      status: {
        ...status,
        historyAvailable: false,
        incidents: [],
        components: status.components.map((entry) => ({ ...entry, uptime: uptime(null, 0) })),
      },
    });

    expect(screen.getByRole('status')).toHaveTextContent(
      en.observability.status.historyUnavailable,
    );
    expect(screen.getAllByText(en.observability.status.noData)).toHaveLength(2);
    expect(screen.queryByText(en.observability.status.incidentsTitle)).not.toBeInTheDocument();
    expect(screen.getByText(en.observability.status.states.down)).toBeInTheDocument();
  });

  it('announces a failed load', () => {
    renderSection({ status: undefined, isError: true });
    expect(screen.getByRole('alert')).toHaveTextContent(en.observability.status.failedToLoad);
  });

  it('shows a loading state while the first answer is on its way', () => {
    renderSection({ status: undefined, isLoading: true });
    expect(screen.getAllByText(en.observability.status.loading).length).toBeGreaterThan(0);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders in Arabic with Arabic labels', () => {
    renderSection({}, Locale.AR, ar);

    expect(screen.getByText(ar.observability.status.title)).toBeInTheDocument();
    expect(screen.getAllByText(ar.observability.status.components.payments).length).toBeGreaterThan(
      0,
    );
    expect(screen.queryByText(en.observability.status.title)).not.toBeInTheDocument();
  });
});
