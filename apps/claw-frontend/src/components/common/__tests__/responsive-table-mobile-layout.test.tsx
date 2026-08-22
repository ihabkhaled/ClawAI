import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ResponsiveTable } from '@/components/common/responsive-table';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('ResponsiveTable mobile layout', () => {
  it('contains long values inside a min-width-safe grid card', () => {
    const { container } = render(
      <ResponsiveTable
        rows={[{ id: '1', value: 'a-very-long-value-without-natural-breaks' }]}
        columns={[{ key: 'value', header: 'Value', render: (row) => row.value }]}
        keyExtractor={(row) => row.id}
        mobileTitle={() => 'Title'}
      />,
    );

    expect(container.querySelector('li')).toHaveClass('min-w-0', 'overflow-hidden');
    expect(container.querySelector('dl > div')).toHaveClass(
      'grid',
      'grid-cols-[minmax(0,2fr)_minmax(0,3fr)]',
    );
    expect(container.querySelector('dd')).toHaveClass('min-w-0', 'break-words');
  });
});
