import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ModelFamilyCard } from '@/components/marketing/home/model-family-card';
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

function provider(count: number): PublicCatalogProvider {
  const models = Array.from({ length: count }, (_, i) => model(`Model ${i + 1}`));
  return { provider: 'OPENAI', displayName: 'OpenAI', modelCount: count, models };
}

describe('ModelFamilyCard', () => {
  it('opens the full model list, not just the six-name sample', async () => {
    // The card shows a sample. A visitor's actual question is "is MY model on
    // this list?", and before this they had to leave the page to find out.
    const user = userEvent.setup();
    render(<ModelFamilyCard provider={provider(9)} />);

    // Six chips on the card, nine models in the catalog.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /showAllModels/u }));

    const dialog = await screen.findByRole('dialog');
    for (let i = 1; i <= 9; i += 1) {
      expect(within(dialog).getByText(`Model ${i}`)).toBeInTheDocument();
    }
  });

  it('counts every model in the button label, not the visible sample', async () => {
    render(<ModelFamilyCard provider={provider(42)} />);
    expect(screen.getByRole('button', { name: /"count":42/u })).toBeInTheDocument();
  });

  it('offers no "show all" when the sample already is the whole list', () => {
    // The button would open a dialog showing nothing new.
    render(<ModelFamilyCard provider={provider(3)} />);
    expect(screen.queryByRole('button', { name: /showAllModels/u })).not.toBeInTheDocument();
  });
});
