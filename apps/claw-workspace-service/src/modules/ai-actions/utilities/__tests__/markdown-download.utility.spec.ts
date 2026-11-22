import { vi } from 'vitest';
import type { Response } from 'express';

import { sendMarkdownDownload } from '../markdown-download.utility';

const fakeResponse = (): {
  res: Response;
  headers: Record<string, string>;
  status: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
} => {
  const headers: Record<string, string> = {};
  const status = vi.fn();
  const send = vi.fn();
  const res = {
    status,
    send,
    setHeader: (name: string, value: string) => {
      headers[name.toLowerCase()] = value;
    },
  } as unknown as Response;
  return { res, headers, status, send };
};

describe('sendMarkdownDownload (CodeQL js/reflected-xss)', () => {
  it('sends user text as a non-HTML, non-sniffable markdown attachment', () => {
    const { res, headers, status, send } = fakeResponse();
    const body = '# Review\n\n<script>alert(1)</script>';

    sendMarkdownDownload(res, 'multi-model-review.md', body);

    expect(status).toHaveBeenCalledWith(200);
    expect(headers['content-type']).toBe('text/markdown; charset=utf-8');
    expect(headers['content-type']).not.toMatch(/html/i);
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['content-disposition']).toBe('attachment; filename="multi-model-review.md"');
    // The markdown body is delivered verbatim; safety comes from the headers.
    expect(send).toHaveBeenCalledWith(body);
  });

  it('sets every header before the body is sent', () => {
    const order: string[] = [];
    const res = {
      status: vi.fn(),
      setHeader: (name: string) => order.push(`header:${name}`),
      send: () => order.push('send'),
    } as unknown as Response;

    sendMarkdownDownload(res, 'x.md', 'body');

    expect(order.at(-1)).toBe('send');
    expect(order.filter((o) => o.startsWith('header:'))).toHaveLength(3);
  });
});
