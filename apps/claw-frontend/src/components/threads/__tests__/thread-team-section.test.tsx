import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ThreadGenerationFormController } from '@/types/thread-publication.types';

import { ThreadTeamSection } from '../thread-team-section';

vi.mock('../thread-model-picker', () => ({
  ThreadModelPicker: ({ label }: { label: string }) => <div data-testid="role-picker">{label}</div>,
}));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function makeForm(
  overrides: Partial<ThreadGenerationFormController> = {},
): ThreadGenerationFormController {
  const model = { provider: 'GEMINI', model: 'flash', displayName: 'Flash' };
  return {
    selectedModels: Array.from({ length: 5 }, () => model),
    changeModel: vi.fn(),
    modelAvailability: new Map(),
    planName: 'Free',
    hasRecommendedTeam: true,
    isRecommendedSelected: true,
    resetToRecommended: vi.fn(),
    ...overrides,
  } as unknown as ThreadGenerationFormController;
}

describe('ThreadTeamSection', () => {
  it('says the recommended team is selected and keeps the pickers under Advanced', () => {
    const { container } = render(<ThreadTeamSection form={makeForm()} />);

    expect(screen.getByTestId('thread-team-summary')).toHaveTextContent('chat.threadTeam.summary');
    const fold = container.querySelector('details');
    expect(fold).not.toBeNull();
    expect(fold?.open).toBe(false);
    expect(fold?.querySelectorAll('[data-testid="role-picker"]')).toHaveLength(5);
  });

  it('offers the way back to the recommended team only after the owner changed it', async () => {
    const resetToRecommended = vi.fn();
    const { rerender } = render(<ThreadTeamSection form={makeForm({ resetToRecommended })} />);
    expect(screen.queryByRole('button', { name: 'chat.threadTeam.reset' })).not.toBeInTheDocument();

    rerender(
      <ThreadTeamSection form={makeForm({ isRecommendedSelected: false, resetToRecommended })} />,
    );
    expect(screen.getByTestId('thread-team-summary')).toHaveTextContent(
      'chat.threadTeam.customised',
    );
    await userEvent.click(screen.getByRole('button', { name: 'chat.threadTeam.reset' }));

    expect(resetToRecommended).toHaveBeenCalledTimes(1);
  });

  it('tells the owner when there is no recommended team', () => {
    render(<ThreadTeamSection form={makeForm({ hasRecommendedTeam: false })} />);

    expect(screen.getByTestId('thread-team-summary')).toHaveTextContent('chat.threadTeam.none');
    expect(screen.queryByRole('button', { name: 'chat.threadTeam.reset' })).not.toBeInTheDocument();
  });
});
