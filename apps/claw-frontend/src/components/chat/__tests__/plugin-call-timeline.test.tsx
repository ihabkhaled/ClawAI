import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MessagePluginRefs } from '@/components/chat/message-plugin-refs';
import { PluginCallTimeline } from '@/components/chat/plugin-call-timeline';
import { PluginCallStatus } from '@/enums/plugin-call-status.enum';
import { PluginNoticeCode } from '@/enums/plugin-notice-code.enum';
import type { PluginCallView } from '@/types/plugin-call.types';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      params === undefined ? key : `${key}:${Object.values(params).join(',')}`,
  }),
}));

function call(overrides: Partial<PluginCallView> = {}): PluginCallView {
  return {
    callId: 'c1',
    round: 1,
    pluginSlug: 'web-fetch',
    toolName: 'fetch_page',
    title: 'Fetch a page',
    riskLevel: 'READ',
    status: PluginCallStatus.OK,
    durationMs: 120,
    truncated: false,
    ...overrides,
  };
}

describe('PluginCallTimeline', () => {
  it('renders nothing for an ordinary answer', () => {
    const { container } = render(<PluginCallTimeline calls={[]} notices={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lists each call with its plugin, outcome and duration', () => {
    render(<PluginCallTimeline calls={[call()]} notices={[]} />);
    const timeline = screen.getByRole('region', { name: 'pluginChat.calls.title' });
    const row = within(timeline).getByRole('listitem');
    expect(row).toHaveTextContent('Fetch a page');
    expect(row).toHaveTextContent('web-fetch');
    expect(row).toHaveTextContent('pluginChat.calls.status.ok');
    expect(row).toHaveTextContent('pluginChat.calls.duration:120');
  });

  it('says so when a call failed or was held back', () => {
    render(
      <PluginCallTimeline
        calls={[
          call({ callId: 'a', status: PluginCallStatus.ERROR }),
          call({ callId: 'b', status: PluginCallStatus.CONSENT_REQUIRED }),
          call({ callId: 'c', status: PluginCallStatus.QUOTA_EXCEEDED, truncated: true }),
        ]}
        notices={[]}
      />,
    );
    expect(screen.getByText('pluginChat.calls.status.error')).toBeInTheDocument();
    expect(screen.getByText('pluginChat.calls.status.consentRequired')).toBeInTheDocument();
    expect(screen.getByText('pluginChat.calls.status.quotaExceeded')).toBeInTheDocument();
    expect(screen.getByText('pluginChat.calls.truncated')).toBeInTheDocument();
  });

  it('shows what the plugin returned as plain text behind a disclosure, never as HTML', () => {
    const hostile = '<img src=x onerror=alert(1)> <a href="https://evil.example">click</a>';
    const { container } = render(
      <PluginCallTimeline calls={[call({ resultExcerpt: hostile })]} notices={[]} />,
    );
    expect(screen.getByText('pluginChat.calls.resultToggle')).toBeInTheDocument();
    expect(screen.getByText(hostile)).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('a')).toBeNull();
  });

  it('omits the disclosure when nothing was returned', () => {
    render(<PluginCallTimeline calls={[call({ status: PluginCallStatus.ERROR })]} notices={[]} />);
    expect(screen.queryByText('pluginChat.calls.resultToggle')).not.toBeInTheDocument();
  });

  it('explains a plugin that did not run, with a status role', () => {
    render(
      <PluginCallTimeline
        calls={[]}
        notices={[
          { code: PluginNoticeCode.SERVICE_UNAVAILABLE },
          { code: PluginNoticeCode.LIMIT_REACHED },
        ]}
      />,
    );
    const notices = screen.getAllByRole('status');
    expect(notices.map((node) => node.textContent)).toEqual([
      'pluginChat.notices.serviceUnavailable',
      'pluginChat.notices.limitReached',
    ]);
  });
});

describe('MessagePluginRefs', () => {
  it('renders nothing when the message mentioned no plugin', () => {
    const { container } = render(<MessagePluginRefs refs={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the plugins the message was sent with', () => {
    render(
      <MessagePluginRefs
        refs={[
          { installId: 'a', label: 'Web fetch' },
          { installId: 'b', label: 'Weather' },
        ]}
      />,
    );
    const list = screen.getByRole('list', { name: 'pluginChat.mention.chipsLabel' });
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Web fetch', 'Weather']);
  });
});
