import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PluginConsentCard } from '@/components/chat/plugin-consent-card';
import { PluginConsentChoice, PluginConsentStatus } from '@/enums/plugin-consent-card.enum';
import { PluginRiskLevel } from '@/enums/plugin-risk-level.enum';
import type { PluginConsentRequestView } from '@/types/plugin-consent-card.types';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      params === undefined ? key : `${key}:${Object.values(params).join(',')}`,
  }),
}));

const NOW = new Date('2026-10-15T10:00:00.000Z');

function request(overrides: Partial<PluginConsentRequestView> = {}): PluginConsentRequestView {
  return {
    id: 'req-1',
    pluginSlug: 'notes',
    pluginName: 'Notes',
    toolName: 'create_note',
    toolTitle: 'Create a note',
    riskLevel: PluginRiskLevel.Write,
    conversationId: 'thread-1',
    messageId: null,
    argsPreview: '{"title":"Groceries","apiKey":"[redacted]"}',
    reason: 'REQUIRED_FIRST_USE',
    status: PluginConsentStatus.Pending,
    choice: null,
    createdAt: NOW.toISOString(),
    expiresAt: new Date(NOW.getTime() + 90_000).toISOString(),
    decidedAt: null,
    options: { allowChat: true, always: true, alwaysNeedsConfirmation: false },
    ...overrides,
  };
}

function setup(overrides: Partial<PluginConsentRequestView> = {}, props: { busy?: boolean } = {}) {
  const onDecide = vi.fn();
  const onExpired = vi.fn();
  render(
    <PluginConsentCard
      request={request(overrides)}
      busy={props.busy ?? false}
      failed={false}
      onDecide={onDecide}
      onExpired={onExpired}
    />,
  );
  return { onDecide, onExpired };
}

describe('PluginConsentCard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the plugin, the tool, the scrubbed arguments as text, the risk and a countdown', () => {
    setup();
    const card = screen.getByRole('alertdialog');
    expect(card).toHaveTextContent('Notes');
    expect(card).toHaveTextContent('Create a note');
    expect(card).toHaveTextContent('create_note');
    expect(card).toHaveTextContent('"apiKey":"[redacted]"');
    expect(screen.getByTestId('plugin-risk-badge')).toBeInTheDocument();
    expect(card).toHaveTextContent('pluginConsent.card.timeLeft:90');
  });

  it('keeps the arguments left-to-right even in a right-to-left page', () => {
    setup();
    const args = screen.getByText(/Groceries/);
    expect(args.tagName).toBe('PRE');
    expect(args).toHaveAttribute('dir', 'ltr');
  });

  it('offers the four answers and sends exactly the one pressed', () => {
    const { onDecide } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'pluginConsent.card.allowOnce' }));
    expect(onDecide).toHaveBeenLastCalledWith('req-1', { choice: PluginConsentChoice.AllowOnce });
    fireEvent.click(screen.getByRole('button', { name: 'pluginConsent.card.allowChat' }));
    expect(onDecide).toHaveBeenLastCalledWith('req-1', { choice: PluginConsentChoice.AllowChat });
    fireEvent.click(screen.getByRole('button', { name: 'pluginConsent.card.alwaysAllow' }));
    expect(onDecide).toHaveBeenLastCalledWith('req-1', { choice: PluginConsentChoice.AlwaysAllow });
    fireEvent.click(screen.getByRole('button', { name: 'pluginConsent.card.deny' }));
    expect(onDecide).toHaveBeenLastCalledWith('req-1', { choice: PluginConsentChoice.Deny });
  });

  it('hides the options the server did not allow', () => {
    setup({ options: { allowChat: false, always: false, alwaysNeedsConfirmation: false } });
    expect(screen.queryByRole('button', { name: 'pluginConsent.card.allowChat' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'pluginConsent.card.alwaysAllow' })).toBeNull();
    expect(screen.getByRole('button', { name: 'pluginConsent.card.allowOnce' })).toBeEnabled();
  });

  it('puts the first focus on Deny so a stray Enter never approves', () => {
    setup();
    expect(screen.getByRole('button', { name: 'pluginConsent.card.deny' })).toHaveFocus();
  });

  it('Escape denies', () => {
    const { onDecide } = setup();
    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });
    expect(onDecide).toHaveBeenCalledWith('req-1', { choice: PluginConsentChoice.Deny });
  });

  it('DESTRUCTIVE: Always allow asks a second question first, and only the second yes sends it', () => {
    const { onDecide } = setup({
      riskLevel: PluginRiskLevel.Destructive,
      options: { allowChat: false, always: true, alwaysNeedsConfirmation: true },
    });
    fireEvent.click(screen.getByRole('button', { name: 'pluginConsent.card.alwaysAllow' }));
    expect(onDecide).not.toHaveBeenCalled();
    expect(screen.getByTestId('plugin-consent-confirm')).toHaveTextContent(
      'pluginConsent.card.confirmBody:Create a note',
    );
    expect(screen.getByRole('button', { name: 'pluginConsent.card.confirmYes' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'pluginConsent.card.confirmYes' }));
    expect(onDecide).toHaveBeenCalledWith('req-1', {
      choice: PluginConsentChoice.AlwaysAllow,
      confirmDestructive: true,
    });
  });

  it('DESTRUCTIVE: going back, or Escape, leaves the confirmation without deciding anything', () => {
    const { onDecide } = setup({
      riskLevel: PluginRiskLevel.Destructive,
      options: { allowChat: false, always: true, alwaysNeedsConfirmation: true },
    });
    fireEvent.click(screen.getByRole('button', { name: 'pluginConsent.card.alwaysAllow' }));
    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });
    expect(screen.queryByTestId('plugin-consent-confirm')).toBeNull();
    expect(onDecide).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'pluginConsent.card.alwaysAllow' }));
    fireEvent.click(screen.getByRole('button', { name: 'pluginConsent.card.confirmBack' }));
    expect(screen.queryByTestId('plugin-consent-confirm')).toBeNull();
    expect(onDecide).not.toHaveBeenCalled();
  });

  it('timeout: when the clock runs out the buttons go away, a plain sentence appears and the list refreshes', () => {
    const { onExpired } = setup({ expiresAt: new Date(NOW.getTime() + 2_000).toISOString() });
    expect(screen.getByRole('button', { name: 'pluginConsent.card.allowOnce' })).toBeEnabled();
    act(() => {
      vi.advanceTimersByTime(3_000);
    });
    expect(screen.queryByRole('button', { name: 'pluginConsent.card.allowOnce' })).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('pluginConsent.card.expired');
    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it('an already-lapsed request opens as expired and offers nothing to press', () => {
    setup({ expiresAt: new Date(NOW.getTime() - 1_000).toISOString() });
    expect(screen.queryByRole('button', { name: 'pluginConsent.card.allowOnce' })).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('pluginConsent.card.expired');
  });

  it('disables every answer while a decision is being saved (no double submit)', () => {
    setup({}, { busy: true });
    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled();
    }
  });
});
