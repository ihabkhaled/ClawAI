import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ModelHubPage } from '@/components/marketing/models/model-hub-page';
import { ModelProviderPage as ModelProviderPageComponent } from '@/components/marketing/models/model-provider-page';
import { MODELS_CONTENT_BY_LOCALE } from '@/constants/models-content.constants';
import { MODEL_PROVIDER_ORDER, getModelProviderPath } from '@/constants/models.constants';
import { Locale } from '@/enums/locale.enum';
import { ModelProviderPage } from '@/enums/model-provider-page.enum';

const catalogResult: { value: unknown } = { value: null };

vi.mock('@/lib/models/public-models-api', () => ({
  fetchPublicModelCatalog: () => Promise.resolve(catalogResult.value),
}));

vi.mock('next/headers', () => ({
  headers: async (): Promise<Headers> => new Headers({ 'x-claw-locale': 'en' }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

function liveModel(displayName: string): Record<string, unknown> {
  return {
    modelKey: displayName.toLowerCase().replaceAll(' ', '-'),
    displayName,
    maxContextTokens: null,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: false,
    supportsAudio: false,
    supportsStructuredOutput: true,
    usageTier: 'UNKNOWN',
  };
}

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

  // Replaces a test that asserted six hand-written model names from a frontend
  // constant. The page now names whatever the connector catalog says it can
  // serve, so the test supplies a catalog instead of encoding a roster.
  it('names the models the live catalog reports for this provider', async () => {
    catalogResult.value = {
      providers: [
        {
          provider: 'OPENAI',
          displayName: 'OpenAI',
          modelCount: 2,
          models: [liveModel('GPT 5'), liveModel('GPT 5 Mini')],
        },
      ],
      totalModelCount: 2,
      providerCount: 1,
      generatedAt: '2026-09-12T00:00:00.000Z',
    };

    render(await ModelProviderPageComponent({ provider: ModelProviderPage.OPENAI }));

    expect(screen.getByText('GPT 5')).toBeInTheDocument();
    expect(screen.getByText('GPT 5 Mini')).toBeInTheDocument();
    // Rule 37: a price never reaches a public surface. The backend does not
    // send one, and this asserts the page cannot grow one either.
    expect(screen.queryByText(/\$\d/u)).not.toBeInTheDocument();
  });

  it('shows only the models of the provider whose page this is', async () => {
    catalogResult.value = {
      providers: [
        {
          provider: 'OPENAI',
          displayName: 'OpenAI',
          modelCount: 1,
          models: [liveModel('GPT 5')],
        },
      ],
      totalModelCount: 1,
      providerCount: 1,
      generatedAt: '2026-09-12T00:00:00.000Z',
    };

    render(await ModelProviderPageComponent({ provider: ModelProviderPage.LOCAL_AI }));

    expect(screen.queryByText('GPT 5')).not.toBeInTheDocument();
  });

  // A failed fetch degrades the catalog block; the translated editorial copy
  // around it still renders, so the page does not disappear over an outage.
  it('says the catalog is unavailable rather than inventing one', async () => {
    catalogResult.value = null;

    render(await ModelProviderPageComponent({ provider: ModelProviderPage.OPENAI }));

    expect(
      screen.getByText(MODELS_CONTENT_BY_LOCALE[Locale.EN].labels.catalogUnavailable),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Models ClawAI can route to' }),
    ).toBeInTheDocument();
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
