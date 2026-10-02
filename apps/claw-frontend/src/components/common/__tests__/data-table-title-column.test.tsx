import { render, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DataTable } from '@/components/common/data-table';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const rows = [
  { id: '1', model: 'claude-a', provider: 'ANTHROPIC' },
  { id: '2', model: 'claude-b', provider: 'ANTHROPIC' },
];

describe('DataTable title column', () => {
  // The card promotes a column to its title and drops it from the card body.
  // The desktop table used the SAME trimmed list, so the Model column vanished
  // from /admin/smart-router/model-costs and every row read "ANTHROPIC".
  it('keeps the title column in the desktop table', () => {
    const { container } = render(
      <DataTable
        columns={[
          { key: 'model', header: 'Model', render: (row) => row.model },
          { key: 'provider', header: 'Provider', render: (row) => row.provider },
        ]}
        data={rows}
        keyExtractor={(row) => row.id}
        mobileTitleKey="model"
      />,
    );

    const table = container.querySelector('table');
    expect(table).not.toBeNull();
    const scoped = within(table as HTMLTableElement);
    expect(scoped.getByText('Model')).toBeInTheDocument();
    expect(scoped.getByText('claude-a')).toBeInTheDocument();
    expect(scoped.getByText('claude-b')).toBeInTheDocument();
  });

  it('still leaves the title column out of the card body', () => {
    const { container } = render(
      <DataTable
        columns={[
          { key: 'model', header: 'Model', render: (row) => row.model },
          { key: 'provider', header: 'Provider', render: (row) => row.provider },
        ]}
        data={rows}
        keyExtractor={(row) => row.id}
        mobileTitleKey="model"
      />,
    );

    const card = container.querySelector('li');
    expect(card).toHaveClass('relative');
    expect(card?.querySelectorAll('dt')).toHaveLength(1);
    expect(card?.querySelector('dt')).toHaveTextContent('Provider');
  });
});
