import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ModelFitHubPage } from '@/components/marketing/model-fit/model-fit-hub-page';
import { ModelFitTaskPage as ModelFitTaskPageComponent } from '@/components/marketing/model-fit/model-fit-task-page';
import { MODEL_FIT_CONTENT_BY_LOCALE } from '@/constants/model-fit-content.constants';
import { MODEL_FIT_TASK_ORDER, getModelFitTaskPath } from '@/constants/model-fit.constants';
import { Locale } from '@/enums/locale.enum';
import { ModelFitTask } from '@/enums/model-fit-task.enum';

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

describe('ModelFitHubPage', () => {
  it('renders exactly one h1 and a card for every task', async () => {
    render(await ModelFitHubPage());

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    for (const task of MODEL_FIT_TASK_ORDER) {
      const title = MODEL_FIT_CONTENT_BY_LOCALE[Locale.EN].tasks[task].title;
      const escaped = title.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
      expect(screen.getByRole('link', { name: new RegExp(`^${escaped}`, 'i') })).toHaveAttribute(
        'href',
        `/en${getModelFitTaskPath(task)}`,
      );
    }
  });

  it('emits a CollectionPage, a breadcrumb trail and an ItemList', async () => {
    const { container } = render(await ModelFitHubPage());
    const types = readJsonLd(container)['@graph'].map((node) => node['@type']);
    expect(types).toEqual(['CollectionPage', 'BreadcrumbList', 'ItemList']);
  });

  it('never uses a "best model" superlative on the hub', async () => {
    const { container } = render(await ModelFitHubPage());
    expect(container.textContent).not.toMatch(/\bbest ai model\b/iu);
  });
});

describe('ModelFitTaskPage', () => {
  it('renders exactly one h1', async () => {
    render(await ModelFitTaskPageComponent({ task: ModelFitTask.CODING }));
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('renders every section as an h2, and the questions block', async () => {
    render(await ModelFitTaskPageComponent({ task: ModelFitTask.CODING }));
    const content = MODEL_FIT_CONTENT_BY_LOCALE[Locale.EN].tasks[ModelFitTask.CODING];
    for (const section of content.sections) {
      expect(screen.getByRole('heading', { level: 2, name: section.heading })).toBeInTheDocument();
    }
    expect(
      screen.getByRole('heading', { level: 2, name: 'Questions people ask' }),
    ).toBeInTheDocument();
  });

  it('never claims a specific model is fastest, and names no latency claim', async () => {
    for (const task of MODEL_FIT_TASK_ORDER) {
      const { container } = render(await ModelFitTaskPageComponent({ task }));
      expect(container.textContent).not.toMatch(/\bfastest\b/iu);
      expect(container.textContent).not.toMatch(/\blatency\b/iu);
    }
  });

  it('carries the catalog disclaimer and links it to /pricing', async () => {
    render(await ModelFitTaskPageComponent({ task: ModelFitTask.CODING }));
    const pricingLinks = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href') === '/en/pricing');
    expect(pricingLinks.length).toBeGreaterThan(0);
  });

  it('research-with-sources correctly says research is billed separately from model credit', async () => {
    render(await ModelFitTaskPageComponent({ task: ModelFitTask.RESEARCH_WITH_SOURCES }));
    expect(screen.getAllByText(/model credit/iu).length).toBeGreaterThan(0);
  });

  it('emits TechArticle with a three-step breadcrumb and the FAQ it renders', async () => {
    const { container } = render(await ModelFitTaskPageComponent({ task: ModelFitTask.CODING }));
    const graph = readJsonLd(container)['@graph'];
    expect(graph.map((node) => node['@type'])).toEqual([
      'TechArticle',
      'BreadcrumbList',
      'FAQPage',
    ]);

    const faqNode = graph[2] as { mainEntity: Array<{ name: string }> };
    const rendered = MODEL_FIT_CONTENT_BY_LOCALE[Locale.EN].tasks[ModelFitTask.CODING].faq;
    expect(faqNode.mainEntity.map((entry) => entry.name)).toEqual(
      rendered.map((entry) => entry.question),
    );
  });

  it('links back to the hub', async () => {
    render(await ModelFitTaskPageComponent({ task: ModelFitTask.CODING }));
    expect(screen.getAllByRole('link', { name: 'All tasks' })[0]).toHaveAttribute(
      'href',
      '/en/model-fit',
    );
  });
});
