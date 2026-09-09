import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { UseCaseTaskPage as UseCaseTaskPageComponent } from '@/components/marketing/use-cases/use-case-task-page';
import { UseCasesTaskCardsSection } from '@/components/marketing/use-cases/use-cases-task-cards-section';
import { USE_CASES_CLUSTER_CONTENT_BY_LOCALE } from '@/constants/use-cases-cluster-content.constants';
import { USE_CASES_TASK_ORDER, getUseCaseTaskPath } from '@/constants/use-cases-cluster.constants';
import { Locale } from '@/enums/locale.enum';
import { UseCaseTask } from '@/enums/use-case-task.enum';

vi.mock('next/headers', () => ({
  headers: async (): Promise<Headers> => new Headers({ 'x-claw-locale': 'en' }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

function readJsonLd(container: HTMLElement): { '@graph': Array<Record<string, unknown>> } {
  const script = container.querySelector('script[type="application/ld+json"]');
  return JSON.parse(script?.textContent ?? '{}') as {
    '@graph': Array<Record<string, unknown>>;
  };
}

describe('UseCasesTaskCardsSection', () => {
  it('renders a card for every task, linking to /en/use-cases/<task>', async () => {
    render(await UseCasesTaskCardsSection());

    for (const task of USE_CASES_TASK_ORDER) {
      const title = USE_CASES_CLUSTER_CONTENT_BY_LOCALE[Locale.EN].tasks[task].title;
      const escaped = title.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
      expect(screen.getByRole('link', { name: new RegExp(`^${escaped}`, 'i') })).toHaveAttribute(
        'href',
        `/en${getUseCaseTaskPath(task)}`,
      );
    }
  });

  it('emits a CollectionPage, a breadcrumb trail and an ItemList', async () => {
    const { container } = render(await UseCasesTaskCardsSection());
    const types = readJsonLd(container)['@graph'].map((node) => node['@type']);
    expect(types).toEqual(['CollectionPage', 'BreadcrumbList', 'ItemList']);
  });
});

describe('UseCaseTaskPage', () => {
  it('renders exactly one h1', async () => {
    render(await UseCaseTaskPageComponent({ task: UseCaseTask.CODING_AND_DEVELOPMENT }));
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('renders every section as an h2, and the questions block', async () => {
    render(await UseCaseTaskPageComponent({ task: UseCaseTask.CODING_AND_DEVELOPMENT }));
    const content =
      USE_CASES_CLUSTER_CONTENT_BY_LOCALE[Locale.EN].tasks[UseCaseTask.CODING_AND_DEVELOPMENT];
    for (const section of content.sections) {
      expect(screen.getByRole('heading', { level: 2, name: section.heading })).toBeInTheDocument();
    }
    expect(
      screen.getByRole('heading', { level: 2, name: 'Questions people ask' }),
    ).toBeInTheDocument();
  });

  it('never claims a compliance certification or fabricated benchmark superlative', async () => {
    for (const task of USE_CASES_TASK_ORDER) {
      const { container } = render(await UseCaseTaskPageComponent({ task }));
      expect(container.textContent).not.toMatch(/\bsoc ?2\b/iu);
      expect(container.textContent).not.toMatch(/\bhipaa\b/iu);
      expect(container.textContent).not.toMatch(/\bfastest\b/iu);
    }
  });

  it('carries a link back to the hub', async () => {
    render(await UseCaseTaskPageComponent({ task: UseCaseTask.CODING_AND_DEVELOPMENT }));
    expect(screen.getAllByRole('link', { name: 'All use cases' })[0]).toHaveAttribute(
      'href',
      '/en/use-cases',
    );
  });

  it('emits TechArticle with a three-step breadcrumb and the FAQ it renders', async () => {
    const { container } = render(
      await UseCaseTaskPageComponent({ task: UseCaseTask.CODING_AND_DEVELOPMENT }),
    );
    const graph = readJsonLd(container)['@graph'];
    expect(graph.map((node) => node['@type'])).toEqual([
      'TechArticle',
      'BreadcrumbList',
      'FAQPage',
    ]);

    const faqNode = graph[2] as { mainEntity: Array<{ name: string }> };
    const rendered =
      USE_CASES_CLUSTER_CONTENT_BY_LOCALE[Locale.EN].tasks[UseCaseTask.CODING_AND_DEVELOPMENT].faq;
    expect(faqNode.mainEntity.map((entry) => entry.name)).toEqual(
      rendered.map((entry) => entry.question),
    );
  });
});
