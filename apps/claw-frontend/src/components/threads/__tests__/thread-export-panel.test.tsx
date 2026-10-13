import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { THREAD_OWNER_EXPORT_OPTIONS } from '@/constants/thread-publication.constants';
import { ThreadPublicationExportFormat } from '@/enums/thread-publication-export-format.enum';
import { saveThreadFile } from '@/utilities/thread-file-download.utility';

import { ThreadExportPanel } from '../thread-export-panel';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params?.['count'] ? `${key}:${params['count']}` : key,
  }),
}));
vi.mock('@/utilities/thread-file-download.utility', () => ({ saveThreadFile: vi.fn() }));

function renderPanel(showPdf = true) {
  const buildFile = vi.fn(async (format: ThreadPublicationExportFormat) => ({
    format,
    name: `a.${format}`,
    mime: 'text/plain',
    content: format,
  }));
  render(
    <ThreadExportPanel
      baseName="thread-1"
      options={THREAD_OWNER_EXPORT_OPTIONS}
      buildFile={buildFile}
      showPdf={showPdf}
    />,
  );
  return { buildFile };
}

describe('ThreadExportPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('offers every format as a labelled shared checkbox with an icon, and no raw input', () => {
    renderPanel();

    const panel = screen.getByTestId('thread-export-panel');
    expect(panel.querySelector('input')).toBeNull();
    for (const option of THREAD_OWNER_EXPORT_OPTIONS) {
      expect(screen.getByRole('checkbox', { name: option.labelKey })).toBeInTheDocument();
    }
    expect(panel.querySelectorAll('svg[aria-hidden="true"]').length).toBeGreaterThanOrEqual(
      THREAD_OWNER_EXPORT_OPTIONS.length,
    );
  });

  it('starts with Markdown ticked and downloads that one file', async () => {
    const user = userEvent.setup();
    const { buildFile } = renderPanel();

    expect(screen.getByRole('checkbox', { name: 'chat.threadExportMarkdown' })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'chat.threadExportDownloadOne' }));

    expect(buildFile).toHaveBeenCalledWith(ThreadPublicationExportFormat.Markdown);
    expect(saveThreadFile).toHaveBeenCalledTimes(1);
  });

  it('turns the Download button into a ZIP when several formats are ticked', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole('checkbox', { name: 'chat.threadExportJson' }));

    expect(
      screen.getByRole('button', { name: 'chat.threadExportDownloadZip:2' }),
    ).toBeInTheDocument();
  });

  it('disables Download and explains why when nothing is ticked', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole('checkbox', { name: 'chat.threadExportMarkdown' }));

    expect(screen.getByRole('button', { name: 'chat.threadExportDownloadOne' })).toBeDisabled();
    expect(screen.getByText('chat.threadExportSelectOne')).toBeInTheDocument();
  });

  it('shows Save as PDF with its hint only where there is something to print', () => {
    renderPanel(true);
    expect(screen.getByRole('button', { name: 'chat.threadExportPdf' })).toBeInTheDocument();
    expect(screen.getByText('chat.threadExportPdfHint')).toBeInTheDocument();
  });

  it('hides Save as PDF when the Thread is not printable yet', () => {
    renderPanel(false);
    expect(screen.queryByRole('button', { name: 'chat.threadExportPdf' })).toBeNull();
    expect(screen.queryByText('chat.threadExportPdfHint')).toBeNull();
  });

  it('opens the browser print dialog for Save as PDF', async () => {
    const user = userEvent.setup();
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    renderPanel();

    await user.click(screen.getByRole('button', { name: 'chat.threadExportPdf' }));

    expect(print).toHaveBeenCalledTimes(1);
    print.mockRestore();
  });

  it('lets the whole format card be clicked, not just the box', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByText('chat.threadExportJson'));

    expect(screen.getByRole('checkbox', { name: 'chat.threadExportJson' })).toBeChecked();
  });
});
