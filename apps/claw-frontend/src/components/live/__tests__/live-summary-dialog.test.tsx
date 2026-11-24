import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LiveSummaryDialog } from '@/components/live/live-summary-dialog';
import { LIVE_TRANSLATIONS } from '@/lib/i18n/locales/live-translations';

/** The real English dictionary with {placeholders}, so a wrong key shows as a raw key. */
function t(key: string, params?: Record<string, string | number>): string {
  let node: unknown = { live: LIVE_TRANSLATIONS.en };
  for (const part of key.split('.')) {
    node =
      typeof node === 'object' && node !== null
        ? (node as Record<string, unknown>)[part]
        : undefined;
  }
  if (typeof node !== 'string') {
    return key;
  }
  return node.replaceAll(/\{(\w+)\}/gu, (_match, name: string) => String(params?.[name] ?? ''));
}

describe('LiveSummaryDialog', () => {
  it('says what a free summary uses, and confirms with a plain Summarize', () => {
    const onConfirm = vi.fn();
    render(
      <LiveSummaryDialog
        estimate={{ minutes: 13, freeMinutesLeft: 30, paidMinutes: 0 }}
        t={t}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );
    const dialog = screen.getByTestId('live-summary-dialog');
    expect(dialog).toHaveTextContent('Uses 13 Live minutes');
    expect(dialog).toHaveTextContent('Free minutes left this month: 30.');
    expect(dialog).not.toHaveTextContent('paid');
    fireEvent.click(screen.getByTestId('live-summary-confirm'));
    expect(screen.getByTestId('live-summary-confirm')).toHaveTextContent('Summarize');
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('names the paid minutes before anything runs and asks for approval', () => {
    render(
      <LiveSummaryDialog
        estimate={{ minutes: 60, freeMinutesLeft: 5, paidMinutes: 55 }}
        t={t}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByRole('note')).toHaveTextContent('55 minutes go past your free minutes');
    expect(screen.getByTestId('live-summary-confirm')).toHaveTextContent('Approve and summarize');
  });

  it('is closed while there is no estimate', () => {
    render(<LiveSummaryDialog estimate={null} t={t} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByTestId('live-summary-dialog')).toBeNull();
  });
});
