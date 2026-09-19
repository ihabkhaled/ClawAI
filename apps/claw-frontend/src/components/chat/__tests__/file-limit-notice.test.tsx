import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FileLimitNotice } from '@/components/chat/file-limit-notice';
import { readFileLimit } from '@/utilities/file-limit.utility';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, number>) =>
      params ? `${key}:${String(params['used'])}/${String(params['limit'])}` : key,
  }),
}));

describe('FileLimitNotice (ADR-110)', () => {
  it('shows the translated limit with the numbers and a way to more files', () => {
    render(<FileLimitNotice used={15} limit={15} />);
    expect(screen.getByText('chat.fileLimitTitle')).toBeInTheDocument();
    expect(screen.getByText('chat.fileLimitBody:15/15')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'chat.limits.upgradeCta' })).toHaveAttribute(
      'href',
      '/plan',
    );
  });
});

describe('readFileLimit', () => {
  it.each([
    [
      { type: 'file_limit', fileLimit: { used: 15, limit: 15, window: 'DAY' } },
      { used: 15, limit: 15 },
    ],
    [{ type: 'file_generation', generationId: 'g1' }, null],
    [{ type: 'file_limit', fileLimit: { used: '15', limit: 15 } }, null],
    [{ type: 'file_limit' }, null],
    [null, null],
  ])('%j → %j', (metadata, expected) => {
    expect(readFileLimit(metadata)).toEqual(expected);
  });
});
