import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ModelRosterSection } from '@/components/marketing/home/model-roster-section';
import { MARKETING_NEWEST_MODELS } from '@/constants/subscription-marketing.constants';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('ModelRosterSection', () => {
  it('renders the latest verified models for every provider family', () => {
    render(<ModelRosterSection />);

    const latestModelsByFamily = [
      { family: 'Anthropic Claude', models: ['Claude Opus 5'] },
      { family: 'OpenAI GPT', models: ['GPT-5.6 Sol', 'GPT-5.6 Terra', 'GPT-5.6 Luna'] },
      { family: 'Google Gemini', models: ['Gemini 3.6 Flash'] },
      { family: 'Moonshot Kimi', models: ['Kimi K2.6', 'Kimi K2.7 Code', 'Kimi K3'] },
      { family: 'Zhipu GLM', models: ['GLM-5.2'] },
      {
        family: 'Alibaba Qwen',
        models: ['Qwen3.5 Plus', 'Qwen3.6 Plus', 'Qwen3.7 Plus'],
      },
      { family: 'DeepSeek', models: ['DeepSeek V4 Pro', 'DeepSeek V4 Flash'] },
      { family: 'xAI Grok', models: ['Grok 4.5', 'Grok 4.20', 'Grok 4.3'] },
      {
        family: 'Amazon Bedrock',
        models: ['Nova 2 Lite', 'GPT-5.6 Sol', 'Claude Opus 5', 'Grok 4.3'],
      },
    ];

    for (const { family, models } of latestModelsByFamily) {
      const card = screen.getByRole('heading', { name: family }).parentElement;
      if (card === null) {
        throw new Error(`Missing model-family card for ${family}`);
      }
      for (const model of models) {
        expect(within(card).getByText(model)).toBeInTheDocument();
      }
    }
  });

  it('renders the concise canonical newest-model roster responsively', () => {
    render(<ModelRosterSection />);

    const list = screen.getByRole('list', { name: 'marketing.home.modelRoster.newestTitle' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(MARKETING_NEWEST_MODELS.length);
    for (const model of MARKETING_NEWEST_MODELS) {
      expect(within(list).getByText(model.label)).toBeInTheDocument();
    }
    expect(list).toHaveClass('grid-cols-2', 'sm:grid-cols-3', 'lg:grid-cols-4');
  });
});
