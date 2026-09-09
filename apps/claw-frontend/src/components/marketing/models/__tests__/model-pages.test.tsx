import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ModelHubPage } from '@/components/marketing/models/model-hub-page';
import { ModelProviderPage as ModelProviderPageComponent } from '@/components/marketing/models/model-provider-page';
import { MODELS_CONTENT_BY_LOCALE } from '@/constants/models-content.constants';
import { MODEL_PROVIDER_ORDER, getModelProviderPath } from '@/constants/models.constants';
import { Locale } from '@/enums/locale.enum';
import { ModelProviderPage } from '@/enums/model-provider-page.enum';

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

describe('ModelHubPage', () => {
  it('renders exactly one h1 and a card for every provider', async () => {
    render(await ModelHubPage());

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    for (const provider of MODEL_PROVIDER_ORDER) {
      const title = MODELS_CONTENT_BY_LOCALE[Locale.EN].providers[provider].title;
      const escaped = title.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
      expect(screen.getByRole('link', { name: new RegExp(`^${escaped}`, 'i') })).toHaveAttribute(
        'href',
        `/en${getModelProviderPath(provider)}`,
      );
    }
  });

  it('emits a CollectionPage, a breadcrumb trail and an ItemList', async () => {
    const { container } = render(await ModelHubPage());
    const types = readJsonLd(container)['@graph'].map((node) => node['@type']);
    expect(types).toEqual(['CollectionPage', 'BreadcrumbList', 'ItemList']);
  });
});

describe('ModelProviderPage', () => {
  it('renders exactly one h1', async () => {
    render(await ModelProviderPageComponent({ provider: ModelProviderPage.OPENAI }));
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('renders every section as an h2, the model catalog block, and the questions block', async () => {
    render(await ModelProviderPageComponent({ provider: ModelProviderPage.OPENAI }));
    const content = MODELS_CONTENT_BY_LOCALE[Locale.EN].providers[ModelProviderPage.OPENAI];
    for (const section of content.sections) {
      expect(screen.getByRole('heading', { level: 2, name: section.heading })).toBeInTheDocument();
    }
    expect(
      screen.getByRole('heading', { level: 2, name: 'Models ClawAI can route to' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Questions people ask' }),
    ).toBeInTheDocument();
  });

  it('names every seeded OpenAI model with a qualitative cost band, never a price', async () => {
    render(await ModelProviderPageComponent({ provider: ModelProviderPage.OPENAI }));
    for (const modelName of ['GPT-5', 'GPT-5 mini', 'GPT-4o', 'GPT-4o mini', 'o3', 'o4-mini']) {
      expect(screen.getByText(modelName)).toBeInTheDocument();
    }
    // No exact currency figure ever appears — cost is qualitative only.
    expect(screen.queryByText(/\$\d/u)).not.toBeInTheDocument();
  });

  it('names no specific model on the Local AI page', async () => {
    render(await ModelProviderPageComponent({ provider: ModelProviderPage.LOCAL_AI }));
    expect(screen.queryByText('GPT-5')).not.toBeInTheDocument();
    expect(screen.queryByText('Claude Opus 4')).not.toBeInTheDocument();
  });

  it('links the catalog disclaimer to /pricing', async () => {
    render(await ModelProviderPageComponent({ provider: ModelProviderPage.ANTHROPIC }));
    const pricingLinks = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href') === '/en/pricing');
    expect(pricingLinks.length).toBeGreaterThan(0);
  });

  it('emits TechArticle with a three-step breadcrumb and the FAQ it renders', async () => {
    const { container } = render(
      await ModelProviderPageComponent({ provider: ModelProviderPage.OPENAI }),
    );
    const graph = readJsonLd(container)['@graph'];
    expect(graph.map((node) => node['@type'])).toEqual([
      'TechArticle',
      'BreadcrumbList',
      'FAQPage',
    ]);

    const faqNode = graph[2] as { mainEntity: Array<{ name: string }> };
    const rendered = MODELS_CONTENT_BY_LOCALE[Locale.EN].providers[ModelProviderPage.OPENAI].faq;
    expect(faqNode.mainEntity.map((entry) => entry.name)).toEqual(
      rendered.map((entry) => entry.question),
    );
  });

  it('links back to the hub', async () => {
    render(await ModelProviderPageComponent({ provider: ModelProviderPage.OPENAI }));
    expect(screen.getAllByRole('link', { name: 'All providers' })[0]).toHaveAttribute(
      'href',
      '/en/model-providers',
    );
  });
});
