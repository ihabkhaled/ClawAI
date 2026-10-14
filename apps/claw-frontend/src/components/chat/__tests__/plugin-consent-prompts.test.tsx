import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PluginConsentPrompts } from '@/components/chat/plugin-consent-prompts';
import { PluginConsentChoice, PluginConsentStatus } from '@/enums/plugin-consent-card.enum';
import { PluginRiskLevel } from '@/enums/plugin-risk-level.enum';
import type { PluginConsentRequestView } from '@/types/plugin-consent-card.types';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      params === undefined ? key : `${key}:${Object.values(params).join(',')}`,
  }),
}));

const { listPending, decide } = vi.hoisted(() => ({ listPending: vi.fn(), decide: vi.fn() }));
vi.mock('@/repositories/plugins/plugin-consent-requests.repository', () => ({
  pluginConsentRequestsRepository: {
    listPending,
    decide,
    listGrants: vi.fn().mockResolvedValue([]),
    revokeGrant: vi.fn(),
  },
}));

function open(overrides: Partial<PluginConsentRequestView> = {}): PluginConsentRequestView {
  return {
    id: 'req-1',
    pluginSlug: 'notes',
    pluginName: 'Notes',
    toolName: 'create_note',
    toolTitle: 'Create a note',
    riskLevel: PluginRiskLevel.Write,
    conversationId: 'thread-1',
    messageId: null,
    argsPreview: '{"title":"x"}',
    reason: 'REQUIRED_FIRST_USE',
    status: PluginConsentStatus.Pending,
    choice: null,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 90_000).toISOString(),
    decidedAt: null,
    options: { allowChat: true, always: true, alwaysNeedsConfirmation: false },
    ...overrides,
  };
}

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PluginConsentPrompts />
    </QueryClientProvider>,
  );
}

describe('PluginConsentPrompts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when no question is waiting', async () => {
    listPending.mockResolvedValue([]);
    const { container } = mount();
    await waitFor(() => expect(listPending).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('stream reconnect: finds the open question on the server and shows its card', async () => {
    listPending.mockResolvedValue([open()]);
    mount();
    expect(await screen.findByTestId('plugin-consent-card')).toHaveTextContent('Create a note');
    expect(
      screen.getByRole('region', { name: 'pluginConsent.card.listLabel' }),
    ).toBeInTheDocument();
  });

  it('never shows a request that is no longer pending or already past its deadline', async () => {
    listPending.mockResolvedValue([
      open({ id: 'a', status: PluginConsentStatus.Denied }),
      open({ id: 'b', expiresAt: new Date(Date.now() - 1_000).toISOString() }),
    ]);
    const { container } = mount();
    await waitFor(() => expect(listPending).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('sends the pressed answer for that request and refreshes the list', async () => {
    listPending.mockResolvedValue([open()]);
    decide.mockResolvedValue(open({ status: PluginConsentStatus.Approved }));
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'pluginConsent.card.allowChat' }));
    await waitFor(() =>
      expect(decide).toHaveBeenCalledWith('req-1', { choice: PluginConsentChoice.AllowChat }),
    );
    await waitFor(() => expect(listPending.mock.calls.length).toBeGreaterThan(1));
  });

  it('shows an error line when saving the answer fails and keeps the card so the user can retry', async () => {
    listPending.mockResolvedValue([open()]);
    decide.mockRejectedValue(new Error('boom'));
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'pluginConsent.card.deny' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('pluginConsent.card.error');
    expect(screen.getByTestId('plugin-consent-card')).toBeInTheDocument();
  });
});
