import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ModelRosterSection } from '@/components/marketing/home/model-roster-section';
import type { PublicCatalogModel, PublicCatalogProvider } from '@/types/public-models.types';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params === undefined ? key : `${key}:${JSON.stringify(params)}`,
  }),
}));

function model(displayName: string): PublicCatalogModel {
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

function provider(displayName: string, models: PublicCatalogModel[]): PublicCatalogProvider {
  return {
    provider: displayName.toUpperCase(),
    displayName,
    modelCount: models.length,
    models,
  };
}

// This suite replaces one that asserted the old hand-written roster — including
// "Moonshot Kimi", "Alibaba Qwen" and "Amazon Bedrock", none of which can serve
// a model here. The test was enforcing the fiction: it would have failed the
// moment anyone corrected the page.
describe('ModelRosterSection', () => {
  it('renders a card per connected provider, naming real models', () => {
    render(
      <ModelRosterSection
        providers={[
          provider('OpenAI', [model('GPT 5'), model('GPT 5 Mini')]),
          provider('Google Gemini', [model('Gemini 2.5 Pro')]),
        ]}
      />,
    );

    const openai = screen.getByRole('heading', { name: 'OpenAI' }).parentElement;
    expect(openai).not.toBeNull();
    expect(within(openai as HTMLElement).getByText('GPT 5')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Google Gemini' })).toBeInTheDocument();
  });

  it('states how many models each provider actually has', () => {
    render(<ModelRosterSection providers={[provider('OpenAI', [model('GPT 5')])]} />);

    expect(
      screen.getByText('marketing.home.modelRoster.modelCount:{"count":1}'),
    ).toBeInTheDocument();
  });

  // OpenAI alone exposes 86 models on a real deployment. The card samples them;
  // the count carries the "there are a lot of these" message.
  it('caps the chips per card rather than printing every model', () => {
    const many = Array.from({ length: 40 }, (_, index) => model(`Model ${String(index)}`));
    render(<ModelRosterSection providers={[provider('OpenAI', many)]} />);

    const card = screen.getByRole('heading', { name: 'OpenAI' }).parentElement as HTMLElement;
    expect(within(card).getAllByRole('listitem').length).toBeLessThanOrEqual(8);
  });

  // The old behaviour was to render a list that had been wrong for months. An
  // empty roster is the honest answer when there is nothing to show.
  it('renders no cards, rather than an invented roster, when nothing is connected', () => {
    render(<ModelRosterSection providers={[]} />);

    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0);
    expect(screen.getByText('marketing.home.modelRoster.title')).toBeInTheDocument();
  });
});
