import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AnswerExpandDialog } from '@/components/chat/answer-expand-dialog';
import { AnswerExportMenu } from '@/components/chat/answer-export-menu';

const { exportAnswer, getById, download, saveTextFile } = vi.hoisted(() => ({
  exportAnswer: vi.fn(),
  getById: vi.fn(),
  download: vi.fn(),
  saveTextFile: vi.fn(),
}));
vi.mock('@/repositories/file-generation/file-generation.repository', () => ({
  fileGenerationRepository: { exportAnswer, getById },
}));
vi.mock('@/hooks/chat/use-file-download', () => ({
  useFileDownload: () => ({ download, isDownloading: false, failed: false }),
}));
vi.mock('@/utilities/answer-export.utility', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  saveTextFile,
}));
vi.mock('@/lib/markdown', () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <div>rendered:{content}</div>,
}));

const t = (key: string): string => key;
const ANSWER = '# Launch plan\n\n**Step one**';

describe('AnswerExportMenu', () => {
  beforeEach(() => vi.clearAllMocks());

  it('saves Markdown in the browser, named after the answer', async () => {
    const user = userEvent.setup();
    render(<AnswerExportMenu content={ANSWER} t={t} />);

    await user.click(screen.getByTestId('answer-export-trigger'));
    await user.click(await screen.findByTestId('answer-export-md'));

    expect(saveTextFile).toHaveBeenCalledWith(
      'Launch plan.md',
      ANSWER,
      'text/markdown;charset=utf-8',
    );
    expect(exportAnswer).not.toHaveBeenCalled();
  });

  it('saves plain text without markdown syntax', async () => {
    const user = userEvent.setup();
    render(<AnswerExportMenu content={ANSWER} t={t} />);

    await user.click(screen.getByTestId('answer-export-trigger'));
    await user.click(await screen.findByTestId('answer-export-txt'));

    expect(saveTextFile).toHaveBeenCalledWith(
      'Launch plan.txt',
      'Launch plan\n\nStep one',
      'text/plain;charset=utf-8',
    );
  });

  // Word and PDF go through the file service and the owner-only link.
  it('converts PDF on the server and downloads the finished file', async () => {
    const user = userEvent.setup();
    exportAnswer.mockResolvedValue({ generationId: 'g1', status: 'QUEUED' });
    getById.mockResolvedValue({
      status: 'COMPLETED',
      assets: [{ downloadUrl: '/api/v1/file-generations/g1/assets/a1/download' }],
    });
    render(<AnswerExportMenu content={ANSWER} t={t} />);

    await user.click(screen.getByTestId('answer-export-trigger'));
    await user.click(await screen.findByTestId('answer-export-pdf'));

    await waitFor(() =>
      expect(download).toHaveBeenCalledWith(
        '/api/v1/file-generations/g1/assets/a1/download',
        'Launch plan.pdf',
      ),
    );
    expect(exportAnswer).toHaveBeenCalledWith(ANSWER, 'PDF', 'Launch plan');
  });

  it('marks the menu as failed when the server export fails', async () => {
    const user = userEvent.setup();
    exportAnswer.mockRejectedValue(new Error('500'));
    render(<AnswerExportMenu content={ANSWER} t={t} />);

    await user.click(screen.getByTestId('answer-export-trigger'));
    await user.click(await screen.findByTestId('answer-export-docx'));

    await waitFor(() =>
      expect(screen.getByTestId('answer-export-trigger')).toHaveAttribute(
        'aria-label',
        'chat.exportFailed',
      ),
    );
  });
});

describe('AnswerExpandDialog', () => {
  it('shows the answer rendered, and its raw markdown on the second tab', async () => {
    const user = userEvent.setup();
    render(<AnswerExpandDialog content={ANSWER} t={t} />);

    fireEvent.click(screen.getByTestId('answer-expand-trigger'));
    expect(await screen.findByTestId('answer-rendered')).toHaveTextContent(
      'rendered:# Launch plan',
    );

    await user.click(screen.getByRole('tab', { name: 'chat.answerRaw' }));
    expect(await screen.findByTestId('answer-raw')).toHaveTextContent('# Launch plan');
  });
});
