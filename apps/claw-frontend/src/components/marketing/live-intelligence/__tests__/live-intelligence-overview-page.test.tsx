import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LiveIntelligenceOverviewPage } from '@/components/marketing/live-intelligence/live-intelligence-overview-page';
import { LIVE_INTELLIGENCE_MARKETING_CONTENT_BY_LOCALE } from '@/constants/live-intelligence-marketing-content.constants';
import { LIVE_INTELLIGENCE_FREE_MINUTES_BY_PLAN } from '@/constants/live-intelligence-marketing.constants';
import { Locale } from '@/enums/locale.enum';

vi.mock('next/headers', () => ({
  headers: async (): Promise<Headers> => new Headers({ 'x-claw-locale': 'en' }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('LiveIntelligenceOverviewPage', () => {
  it('renders one h1, the section headings and every plan row', async () => {
    const { container } = render(await LiveIntelligenceOverviewPage());

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole('heading', { level: 2, name: 'What it can and cannot analyze' }),
    ).toBeInTheDocument();
    for (const row of LIVE_INTELLIGENCE_FREE_MINUTES_BY_PLAN) {
      expect(container.textContent).toContain(`${row.minutes} free minutes a month`);
    }
    expect(container.textContent).toContain('$0.02 per minute');
    expect(container.querySelectorAll('img')).toHaveLength(0);
  });

  it('links the open call to action to the signed-in screen', async () => {
    render(await LiveIntelligenceOverviewPage());
    const links = screen.getAllByRole('link', { name: 'Open Live Intelligence' });
    expect(links[0]).toHaveAttribute('href', '/en/live');
  });
});

describe('Live Intelligence marketing content', () => {
  const english = LIVE_INTELLIGENCE_MARKETING_CONTENT_BY_LOCALE[Locale.EN];

  it('translates every locale: no non-English body repeats the English', () => {
    for (const locale of Object.values(Locale)) {
      if (locale === Locale.EN) {
        continue;
      }
      const content = LIVE_INTELLIGENCE_MARKETING_CONTENT_BY_LOCALE[locale];
      expect(content.title, locale).not.toBe(english.title);
      expect(content.intro, locale).not.toBe(english.intro);
      expect(content.plansBody, locale).not.toBe(english.plansBody);
      expect(content.steps).toHaveLength(english.steps.length);
      expect(content.features).toHaveLength(english.features.length);
      expect(content.faq).toHaveLength(english.faq.length);
      for (const [index, step] of content.steps.entries()) {
        expect(step.body, `${locale} step ${index}`).not.toBe(english.steps[index]?.body);
      }
    }
  });

  it('keeps the honest limits in every locale', () => {
    for (const locale of Object.values(Locale)) {
      const content = LIVE_INTELLIGENCE_MARKETING_CONTENT_BY_LOCALE[locale];
      const sources = content.sources.map((item) => item.title + item.body).join(' ');
      const faq = content.faq.map((entry) => entry.question + entry.answer).join(' ');
      expect(sources, locale).toContain('YouTube');
      expect(faq, locale).toContain('YouTube');
      expect(content.plansBody, locale).toContain('{price}');
    }
  });
});
