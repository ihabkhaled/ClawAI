import { HttpStatus } from '@nestjs/common';
import { contentDispositionHeader, ContentDispositionType } from '@claw/shared-utilities';
import type { Response } from 'express';

/**
 * Sends a markdown document as a file download.
 *
 * The body carries user-supplied text (the reviewed diff), so the response must
 * never be rendered as HTML: the content type is set on the same response,
 * right before the send, and sniffing is switched off. A route-level
 * `@Header` plus a returned string is invisible to CodeQL js/reflected-xss,
 * which needs the non-HTML Content-Type on the response that sends the value.
 */
export function sendMarkdownDownload(res: Response, filename: string, markdown: string): void {
  res.status(HttpStatus.OK);
  // Express `res.set` / `res.type` (not the raw `setHeader`) are what CodeQL reads as the
  // response's content type, so the send below is known to be non-HTML.
  res.type('text/markdown; charset=utf-8');
  res.set('X-Content-Type-Options', 'nosniff');
  res.set(
    'Content-Disposition',
    contentDispositionHeader(ContentDispositionType.ATTACHMENT, filename),
  );
  res.send(markdown);
}
