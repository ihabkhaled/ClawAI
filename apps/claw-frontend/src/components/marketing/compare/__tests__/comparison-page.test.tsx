import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ComparisonHubPage } from '@/components/marketing/compare/comparison-hub-page';
import { ComparisonPage } from '@/components/marketing/compare/comparison-page';
import { COMPARISON_DIMENSION_ORDER, COMPARISON_RIVAL_ORDER  } from '@/constants/public-comparison.constants';
import { ComparisonRival } from '@/enums/comparison-rival.enum';

vi.mock('next/headers', () => ({
  headers: async (): Promise<Headers> => new Headers({ 'x-claw-locale': 'en' }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

function readJsonLd(container: HTMLElement): Record<string, unknown> {
  const script = container.querySelector('script[type="application/ld+json"]');
  return JSON.parse(script?.textContent ?? '{}') as Record<string, unknown>;
}

describe('ComparisonPage', () => {
  it('renders exactly one h1 and the five named sections', async () => {
    render(await ComparisonPage({ rival: ComparisonRival.CHATGPT }));

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('navigation', { name: 'On this page' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'At a glance' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Where ChatGPT is strong' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Where ClawAI works differently' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Which one to choose' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Questions people ask' }),
    ).toBeInTheDocument();
  });

  it('marks the matrix up as a real table with row and column headers', async () => {
    // The table is the part an assistant is most likely to quote, and the part a
    // screen reader cannot make sense of without scoped headers.
    render(await ComparisonPage({ rival: ComparisonRival.CLAUDE }));

    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('columnheader')).toHaveLength(3);
    expect(within(table).getAllByRole('rowheader')).toHaveLength(COMPARISON_DIMENSION_ORDER.length);
    expect(within(table).getByRole('columnheader', { name: 'Claude' })).toBeInTheDocument();
  });

  it('substitutes the rival name into every template label', async () => {
    const { container } = render(await ComparisonPage({ rival: ComparisonRival.PERPLEXITY }));

    expect(screen.getByText('Choose Perplexity if')).toBeInTheDocument();
    // An unsubstituted placeholder rendering to the reader is the exact failure
    // the {rival} token risks, and it is silent in TypeScript.
    expect(container.textContent).not.toContain('{rival}');
  });

  it('emits WebPage, BreadcrumbList and FAQPage that agree with the visible text', async () => {
    const { container } = render(await ComparisonPage({ rival: ComparisonRival.GEMINI }));

    const jsonLd = readJsonLd(container);
    const graph = jsonLd['@graph'] as Array<Record<string, unknown>>;
    expect(graph.map((node) => node['@type'])).toEqual(['WebPage', 'BreadcrumbList', 'FAQPage']);
    // Google withdraws FAQ rich results when the markup claims questions the
    // page does not show, so the questions must come from the rendered array.
    const faq = graph[2]?.['mainEntity'] as Array<{ name: string }>;
    for (const entry of faq) {
      expect(screen.getByText(entry.name)).toBeInTheDocument();
    }
    // No fabricated rating or review: those types are the reason vendor-authored
    // comparison markup gets ignored.
    expect(container.innerHTML).not.toContain('AggregateRating');
    expect(container.innerHTML).not.toContain('"Review"');
  });

  it('links to every other comparison and never to itself', async () => {
    render(await ComparisonPage({ rival: ComparisonRival.COPILOT }));

    const rail = screen.getByRole('navigation', {
      name: 'Compare ClawAI with another assistant',
    });
    const hrefs = within(rail)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));

    // Derived from the order rather than hardcoded: the rail's contract is
    // "every rival except this one", and pinning a count here would just have
    // to be edited again the next time a rival is added.
    expect(hrefs).toHaveLength(COMPARISON_RIVAL_ORDER.length - 1);
    expect(hrefs).not.toContain('/en/compare/copilot');
    expect(hrefs).toContain('/en/compare/chatgpt');
    expect(hrefs).toContain('/en/compare/kimi');
  });

  it('states the independence disclaimer on the page itself', async () => {
    render(await ComparisonPage({ rival: ComparisonRival.CHATGPT }));

    expect(screen.getByText(/independent product/i)).toBeInTheDocument();
    expect(screen.getByText(/2026-08-27/)).toBeInTheDocument();
  });
});

describe('ComparisonHubPage', () => {
  it('lists every comparison as a card and as an ItemList', async () => {
    const { container } = render(await ComparisonHubPage());

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    const graph = readJsonLd(container)['@graph'] as Array<Record<string, unknown>>;
    expect(graph.map((node) => node['@type'])).toEqual(['WebPage', 'BreadcrumbList', 'ItemList']);
    expect(graph[2]?.['itemListElement']).toHaveLength(COMPARISON_RIVAL_ORDER.length);
    expect(screen.getByText('Compare with ChatGPT')).toBeInTheDocument();
    expect(screen.getByText('Compare with Microsoft Copilot')).toBeInTheDocument();
  });
});
