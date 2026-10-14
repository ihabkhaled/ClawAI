import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ThreadSafetyFindingKind } from '@/enums/thread-safety-finding-kind.enum';

import { ThreadSafetyBlockNotice } from '../thread-safety-block-notice';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('ThreadSafetyBlockNotice', () => {
  it('names each flagged passage with its kind so the owner can remove it', () => {
    render(
      <ThreadSafetyBlockNotice
        block={{
          reasons: ['POSSIBLE_PII'],
          findings: [
            {
              reason: 'POSSIBLE_PII',
              kind: ThreadSafetyFindingKind.Email,
              excerpt: 'write to person@example.com for more',
            },
            {
              reason: 'POSSIBLE_PII',
              kind: ThreadSafetyFindingKind.Card,
              excerpt: 'pay with 4111 •••• •••• 1111 today',
            },
          ],
        }}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('chat.threadFixSafetyTitle');
    expect(screen.getByRole('alert')).toHaveTextContent('chat.threadFixSafetyHint');
    expect(screen.getByRole('alert')).toHaveTextContent('chat.threadFixSafetyKindEmail');
    expect(screen.getByRole('alert')).toHaveTextContent('person@example.com');
    expect(screen.getByRole('alert')).toHaveTextContent('chat.threadFixSafetyKindCard');
    expect(screen.getByRole('alert')).toHaveTextContent('4111 •••• •••• 1111');
  });
});
