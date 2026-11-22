import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';

import { LiveExportFormat } from '../../../../common/enums/live-export-format.enum';
import { LiveFeedEventKind } from '../../../../generated/prisma';
import { HistoryExportService } from '../history-export.service';

const session = {
  id: 's1',
  startedAt: new Date('2026-11-22T10:00:00Z'),
  language: 'en',
  stream: {
    title: 'Keynote',
    sourceKind: 'HLS',
    sourceUrl: 'https://x/live',
    accessScope: 'PRIVATE:other',
  },
};

const events = [
  {
    id: 'e1',
    eventKey: 'k',
    kind: LiveFeedEventKind.SUMMARY,
    highlightType: null,
    startAt: Date.UTC(2026, 10, 22, 10, 0, 0),
    endAt: null,
    importance: 1,
    confidence: null,
    title: 'Opening',
    body: 'Welcome.',
    evidence: [],
    version: 1,
    translated: false,
  },
];

function build(owned = true) {
  const history = {
    requireOwnedSession: owned
      ? vi.fn().mockResolvedValue(session)
      : vi.fn().mockRejectedValue(new NotFoundException()),
    collectEvents: vi.fn().mockResolvedValue({ events, truncated: false }),
  };
  const pdfRenderer = { render: vi.fn().mockResolvedValue(Buffer.from('%PDF-1.7')) };
  return {
    history,
    pdfRenderer,
    service: new HistoryExportService(history as never, pdfRenderer as never),
  };
}

describe('HistoryExportService', () => {
  it('exports markdown as a download without the other users private source url', async () => {
    const { service } = build();
    const file = await service.export('u1', 's1', LiveExportFormat.MARKDOWN);
    expect(file.mimeType).toBe('text/markdown; charset=utf-8');
    expect(file.fileName).toBe('live-s1.md');
    const text = file.body.toString('utf8');
    expect(text).toContain('# Keynote');
    expect(text).toContain('Opening');
    expect(text).not.toContain('https://x/live');
  });

  it('exports plain text', async () => {
    const { service } = build();
    const file = await service.export('u1', 's1', LiveExportFormat.TXT);
    expect(file.mimeType).toBe('text/plain; charset=utf-8');
    expect(file.fileName).toBe('live-s1.txt');
    expect(file.body.toString('utf8')).toContain('[10:00:00] Card: Opening');
  });

  it('renders PDF from the markdown export through file-generation', async () => {
    const { service, pdfRenderer } = build();
    const file = await service.export('u1', 's1', LiveExportFormat.PDF);
    expect(file.mimeType).toBe('application/pdf');
    expect(file.fileName).toBe('live-s1.pdf');
    expect(file.body.toString('utf8')).toBe('%PDF-1.7');
    const [markdown, title] = pdfRenderer.render.mock.calls[0] as [string, string];
    expect(markdown).toContain('# Keynote');
    expect(markdown).not.toContain('https://x/live');
    expect(title).toBe('Keynote');
  });

  it('answers 503 when the PDF renderer is unavailable', async () => {
    const { service, pdfRenderer } = build();
    pdfRenderer.render.mockRejectedValue(new ServiceUnavailableException());
    await expect(service.export('u1', 's1', LiveExportFormat.PDF)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('answers 404 for another users session', async () => {
    const { service } = build(false);
    await expect(service.export('u2', 's1', LiveExportFormat.TXT)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
