import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FeatureCapabilityPage as FeatureCapabilityPageComponent } from '@/components/marketing/features/feature-capability-page';
import { FeaturesCapabilityCardsSection } from '@/components/marketing/features/features-capability-cards-section';
import { FEATURES_CLUSTER_CONTENT_BY_LOCALE } from '@/constants/features-cluster-content.constants';
import {
  FEATURES_CAPABILITY_ORDER,
  getFeatureCapabilityPath,
} from '@/constants/features-cluster.constants';
import { FeatureCapability } from '@/enums/feature-capability.enum';
import { Locale } from '@/enums/locale.enum';

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

describe('FeaturesCapabilityCardsSection', () => {
  it('renders a card for every capability, linking to /en/features/<capability>', async () => {
    render(await FeaturesCapabilityCardsSection());

    for (const capability of FEATURES_CAPABILITY_ORDER) {
      const title = FEATURES_CLUSTER_CONTENT_BY_LOCALE[Locale.EN].capabilities[capability].title;
      const escaped = title.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
      expect(screen.getByRole('link', { name: new RegExp(`^${escaped}`, 'i') })).toHaveAttribute(
        'href',
        `/en${getFeatureCapabilityPath(capability)}`,
      );
    }
  });

  it('emits a CollectionPage, a breadcrumb trail and an ItemList', async () => {
    const { container } = render(await FeaturesCapabilityCardsSection());
    const types = readJsonLd(container)['@graph'].map((node) => node['@type']);
    expect(types).toEqual(['CollectionPage', 'BreadcrumbList', 'ItemList']);
  });
});

describe('FeatureCapabilityPage', () => {
  it('renders exactly one h1', async () => {
    render(
      await FeatureCapabilityPageComponent({
        capability: FeatureCapability.MODEL_ROUTING_AND_ORCHESTRATION,
      }),
    );
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('renders every section as an h2, and the questions block', async () => {
    render(
      await FeatureCapabilityPageComponent({
        capability: FeatureCapability.MODEL_ROUTING_AND_ORCHESTRATION,
      }),
    );
    const content =
      FEATURES_CLUSTER_CONTENT_BY_LOCALE[Locale.EN].capabilities[
        FeatureCapability.MODEL_ROUTING_AND_ORCHESTRATION
      ];
    for (const section of content.sections) {
      expect(screen.getByRole('heading', { level: 2, name: section.heading })).toBeInTheDocument();
    }
    expect(
      screen.getByRole('heading', { level: 2, name: 'Questions people ask' }),
    ).toBeInTheDocument();
  });

  it('never claims a compliance certification or fabricated benchmark superlative', async () => {
    for (const capability of FEATURES_CAPABILITY_ORDER) {
      const { container } = render(await FeatureCapabilityPageComponent({ capability }));
      expect(container.textContent).not.toMatch(/\bsoc ?2\b/iu);
      expect(container.textContent).not.toMatch(/\bhipaa\b/iu);
      expect(container.textContent).not.toMatch(/\bfastest\b/iu);
    }
  });

  it('carries a link back to the hub', async () => {
    render(
      await FeatureCapabilityPageComponent({
        capability: FeatureCapability.MODEL_ROUTING_AND_ORCHESTRATION,
      }),
    );
    expect(screen.getAllByRole('link', { name: 'All features' })[0]).toHaveAttribute(
      'href',
      '/en/features',
    );
  });

  it('emits TechArticle with a three-step breadcrumb and the FAQ it renders', async () => {
    const { container } = render(
      await FeatureCapabilityPageComponent({
        capability: FeatureCapability.MODEL_ROUTING_AND_ORCHESTRATION,
      }),
    );
    const graph = readJsonLd(container)['@graph'];
    expect(graph.map((node) => node['@type'])).toEqual([
      'TechArticle',
      'BreadcrumbList',
      'FAQPage',
    ]);

    const faqNode = graph[2] as { mainEntity: Array<{ name: string }> };
    const rendered =
      FEATURES_CLUSTER_CONTENT_BY_LOCALE[Locale.EN].capabilities[
        FeatureCapability.MODEL_ROUTING_AND_ORCHESTRATION
      ].faq;
    expect(faqNode.mainEntity.map((entry) => entry.name)).toEqual(
      rendered.map((entry) => entry.question),
    );
  });
});
