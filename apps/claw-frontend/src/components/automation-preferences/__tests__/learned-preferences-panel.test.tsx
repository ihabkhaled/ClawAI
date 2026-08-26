import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LearnedPreferencesPanel } from '@/components/automation-preferences/learned-preferences-panel';

const mockUseLearnedPreferences = vi.fn();
const mockDismiss = vi.fn();
const mockUseDismissLearnedPreference = vi.fn();

vi.mock('@/hooks/automation-preferences/use-learned-preferences', () => ({
  useLearnedPreferences: () => mockUseLearnedPreferences(),
}));

vi.mock('@/hooks/automation-preferences/use-dismiss-learned-preference', () => ({
  useDismissLearnedPreference: () => mockUseDismissLearnedPreference(),
}));

const t = (key: string, params?: Record<string, string | number>): string =>
  params?.count !== undefined ? `${key}:${String(params.count)}` : key;

const sampleItem = {
  id: 'p1',
  content: 'User prefers concise drafts',
  type: 'PREFERENCE',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

describe('LearnedPreferencesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDismissLearnedPreference.mockReturnValue({
      dismiss: mockDismiss,
      isPending: false,
      pendingId: null,
    });
  });

  it('shows the loading state', () => {
    mockUseLearnedPreferences.mockReturnValue({ items: [], isLoading: true, isError: false });
    render(<LearnedPreferencesPanel t={t} />);
    expect(screen.getByText('learned.panel.loading')).toBeInTheDocument();
  });

  it('shows the error state', () => {
    mockUseLearnedPreferences.mockReturnValue({ items: [], isLoading: false, isError: true });
    render(<LearnedPreferencesPanel t={t} />);
    expect(screen.getByText('learned.panel.error')).toBeInTheDocument();
  });

  it('shows the empty state when there are no learned preferences', () => {
    mockUseLearnedPreferences.mockReturnValue({ items: [], isLoading: false, isError: false });
    render(<LearnedPreferencesPanel t={t} />);
    expect(screen.getByText('learned.panel.empty')).toBeInTheDocument();
  });

  it('renders each item with its content and a dismiss button', () => {
    mockUseLearnedPreferences.mockReturnValue({
      items: [sampleItem],
      isLoading: false,
      isError: false,
    });
    render(<LearnedPreferencesPanel t={t} />);
    expect(screen.getByText('User prefers concise drafts')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'learned.panel.dismiss' })).toBeInTheDocument();
  });

  it('calls dismiss with the item id when its dismiss button is clicked', async () => {
    mockUseLearnedPreferences.mockReturnValue({
      items: [sampleItem],
      isLoading: false,
      isError: false,
    });
    const user = userEvent.setup();
    render(<LearnedPreferencesPanel t={t} />);

    await user.click(screen.getByRole('button', { name: 'learned.panel.dismiss' }));

    expect(mockDismiss).toHaveBeenCalledWith('p1');
  });

  it('disables only the dismiss button for the item currently being dismissed', () => {
    mockUseLearnedPreferences.mockReturnValue({
      items: [sampleItem, { ...sampleItem, id: 'p2', content: 'Another preference' }],
      isLoading: false,
      isError: false,
    });
    mockUseDismissLearnedPreference.mockReturnValue({
      dismiss: mockDismiss,
      isPending: true,
      pendingId: 'p1',
    });
    render(<LearnedPreferencesPanel t={t} />);

    const buttons = screen.getAllByRole('button', { name: 'learned.panel.dismiss' });
    expect(buttons[0]).toBeDisabled();
    expect(buttons[1]).toBeEnabled();
  });
});
