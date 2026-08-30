import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { IntegrationHubPage } from '@/components/marketing/integrations/integration-hub-page';
import { IntegrationTopicPage } from '@/components/marketing/integrations/integration-topic-page';
import { INTEGRATIONS_CONTENT_BY_LOCALE } from '@/constants/integrations-content.constants';
import { INTEGRATION_TOPIC_ORDER, getIntegrationPath } from '@/constants/integrations.constants';
import { IntegrationTopic } from '@/enums/integration-topic.enum';
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

describe('IntegrationHubPage', () => {
  it('renders exactly one h1 and a card for every connector', async () => {
    render(await IntegrationHubPage());

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    for (const topic of INTEGRATION_TOPIC_ORDER) {
      const title = INTEGRATIONS_CONTENT_BY_LOCALE[Locale.EN].topics[topic].title;
      // Anchored to the start: a card's accessible name is its title followed
      // by its summary, and several summaries mention another connector by
      // name (e.g. Figma's mentions Jira) — an unanchored match would find
      // both cards.
      const escaped = title.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
      expect(screen.getByRole('link', { name: new RegExp(`^${escaped}`, 'i') })).toHaveAttribute(
        'href',
        `/en${getIntegrationPath(topic)}`,
      );
    }
  });

  it('emits a CollectionPage, a breadcrumb trail and an ItemList', async () => {
    const { container } = render(await IntegrationHubPage());
    const types = readJsonLd(container)['@graph'].map((node) => node['@type']);
    expect(types).toEqual(['CollectionPage', 'BreadcrumbList', 'ItemList']);
  });
});

describe('IntegrationTopicPage', () => {
  it('renders exactly one h1', async () => {
    render(await IntegrationTopicPage({ topic: IntegrationTopic.GITHUB }));
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('renders every section as an h2, the capabilities block, and the questions block', async () => {
    render(await IntegrationTopicPage({ topic: IntegrationTopic.GITHUB }));
    const content = INTEGRATIONS_CONTENT_BY_LOCALE[Locale.EN].topics[IntegrationTopic.GITHUB];
    for (const section of content.sections) {
      expect(screen.getByRole('heading', { level: 2, name: section.heading })).toBeInTheDocument();
    }
    expect(
      screen.getByRole('heading', { level: 2, name: 'What this connector can do' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Questions people ask' }),
    ).toBeInTheDocument();
  });

  it('emits TechArticle with a three-step breadcrumb and the FAQ it renders', async () => {
    const { container } = render(await IntegrationTopicPage({ topic: IntegrationTopic.GITHUB }));
    const graph = readJsonLd(container)['@graph'];
    expect(graph.map((node) => node['@type'])).toEqual([
      'TechArticle',
      'BreadcrumbList',
      'FAQPage',
    ]);

    // Visible text and structured data must come from one source, which is the
    // condition attached to FAQ rich results.
    const faqNode = graph[2] as { mainEntity: Array<{ name: string }> };
    const rendered = INTEGRATIONS_CONTENT_BY_LOCALE[Locale.EN].topics[IntegrationTopic.GITHUB].faq;
    expect(faqNode.mainEntity.map((entry) => entry.name)).toEqual(
      rendered.map((entry) => entry.question),
    );
  });

  it('links back to the hub', async () => {
    render(await IntegrationTopicPage({ topic: IntegrationTopic.GITHUB }));
    expect(screen.getAllByRole('link', { name: 'All integrations' })[0]).toHaveAttribute(
      'href',
      '/en/integrations',
    );
  });
});

// Every count the copy quotes is a placeholder resolved at render. A raw
// `{connectorCount}` reaching a reader is worse than a stale number, because it
// is visibly broken — and it is exactly what happens if a new string is added
// to the content files without going through the formatter.
describe('product counts are always resolved', () => {
  it('leaves no placeholder in any locale of the integrations cluster', () => {
    for (const locale of Object.values(Locale)) {
      const dictionary = INTEGRATIONS_CONTENT_BY_LOCALE[locale];
      for (const topic of INTEGRATION_TOPIC_ORDER) {
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
