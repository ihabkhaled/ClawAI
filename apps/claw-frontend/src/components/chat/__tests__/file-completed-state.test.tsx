import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FileCompletedState } from '@/components/chat/file-completed-state';

vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const base = {
  filename: 'Q3 Sales.xlsx',
  format: 'XLSX',
  sizeBytes: 3300,
  minutesLeft: 42,
  isDownloading: false,
  downloadFailed: false,
  onDownload: vi.fn(),
};

describe('FileCompletedState', () => {
  // ADR-109: the card shows the AI's title and first sentence, not "generated-<ms>.xlsx".
  it('shows the title, the description and the filename', () => {
    render(
      <FileCompletedState
        {...base}
        title="Q3 Sales: North vs South"
        description="Revenue grew 12%."
      />,
    );
    expect(screen.getByText('Q3 Sales: North vs South')).toBeInTheDocument();
    expect(screen.getByTestId('file-description')).toHaveTextContent('Revenue grew 12%.');
    expect(screen.getByText(/Q3 Sales\.xlsx/u)).toBeInTheDocument();
  });

  it('falls back to the filename for older files without a title', () => {
    render(<FileCompletedState {...base} title={null} description={null} />);
    expect(screen.getByText('Q3 Sales.xlsx')).toBeInTheDocument();
    expect(screen.queryByTestId('file-description')).toBeNull();
  });

  it('renders a model-written title as text, never as markup', () => {
    const { container } = render(
      <FileCompletedState {...base} title="<img src=x onerror=alert(1)>" description="<b>x</b>" />,
    );
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
  });

  it('lets an Arabic title run right to left', () => {
    render(<FileCompletedState {...base} title="خطة الربع" description={null} />);
    expect(screen.getByText('خطة الربع')).toHaveAttribute('dir', 'auto');
  });
});
