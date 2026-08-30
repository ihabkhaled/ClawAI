import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LearnHubPage } from '@/components/marketing/learn/learn-hub-page';
import { LearnTopicPage } from '@/components/marketing/learn/learn-topic-page';
import { LEARN_CONTENT_BY_LOCALE } from '@/constants/learn-content.constants';
import { LEARN_TOPIC_ORDER, getLearnTopicPath } from '@/constants/learn.constants';
import { LearnTopic } from '@/enums/learn-topic.enum';
import { Locale } from '@/enums/locale.enum';
import { hasUnresolvedProductCount } from '@/utilities/product-counts.utility';

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

describe('LearnHubPage', () => {
  it('renders exactly one h1 and a card for every topic', async () => {
    render(await LearnHubPage());

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    for (const topic of LEARN_TOPIC_ORDER) {
      const title = LEARN_CONTENT_BY_LOCALE[Locale.EN].topics[topic].title;
      expect(screen.getByRole('link', { name: new RegExp(title, 'i') })).toHaveAttribute(
        'href',
        `/en${getLearnTopicPath(topic)}`,
      );
    }
  });

  it('emits a CollectionPage, a breadcrumb trail and an ItemList', async () => {
    const { container } = render(await LearnHubPage());
    const types = readJsonLd(container)['@graph'].map((node) => node['@type']);
    expect(types).toEqual(['CollectionPage', 'BreadcrumbList', 'ItemList']);
  });
});

describe('LearnTopicPage', () => {
  it('renders exactly one h1', async () => {
    render(await LearnTopicPage({ topic: LearnTopic.WHAT_IS_RAG }));
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('renders every section as an h2, plus the questions block', async () => {
    render(await LearnTopicPage({ topic: LearnTopic.WHAT_IS_RAG }));
    const content = LEARN_CONTENT_BY_LOCALE[Locale.EN].topics[LearnTopic.WHAT_IS_RAG];
    for (const section of content.sections) {
      expect(screen.getByRole('heading', { level: 2, name: section.heading })).toBeInTheDocument();
    }
    expect(
      screen.getByRole('heading', { level: 2, name: 'Questions people ask' }),
    ).toBeInTheDocument();
  });

  it('emits TechArticle with a three-step breadcrumb and the FAQ it renders', async () => {
    const { container } = render(await LearnTopicPage({ topic: LearnTopic.WHAT_IS_RAG }));
    const graph = readJsonLd(container)['@graph'];
    expect(graph.map((node) => node['@type'])).toEqual([
      'TechArticle',
      'BreadcrumbList',
      'FAQPage',
    ]);

    // Visible text and structured data must come from one source, which is the
    // condition attached to FAQ rich results.
    const faqNode = graph[2] as { mainEntity: Array<{ name: string }> };
    const rendered = LEARN_CONTENT_BY_LOCALE[Locale.EN].topics[LearnTopic.WHAT_IS_RAG].faq;
    expect(faqNode.mainEntity.map((entry) => entry.name)).toEqual(
      rendered.map((entry) => entry.question),
    );
  });

  it('links back to the hub', async () => {
    render(await LearnTopicPage({ topic: LearnTopic.WHAT_IS_RAG }));
    expect(screen.getAllByRole('link', { name: 'All explainers' })[0]).toHaveAttribute(
      'href',
      '/en/learn',
    );
  });
});

// Every count the copy quotes is a placeholder resolved at render. A raw
// `{connectorCount}` reaching a reader is worse than a stale number, because it
// is visibly broken — and it is exactly what happens if a new string is added
// to the content files without going through the formatter.
describe('product counts are always resolved', () => {
  it('leaves no placeholder in any locale of the learn cluster', () => {
    for (const locale of Object.values(Locale)) {
      const dictionary = LEARN_CONTENT_BY_LOCALE[locale];
      for (const topic of LEARN_TOPIC_ORDER) {
        const content = dictionary.topics[topic];
        const rendered = [
          content.title,
          content.eyebrow,
          content.seo.title,
          content.seo.description,
        ];
        for (const value of rendered) {
          // Titles and metadata are NOT passed through the formatter, so they
          // must not contain a placeholder in the first place.
          expect(hasUnresolvedProductCount(value)).toBe(false);
        }
      }
    }
  });
});
