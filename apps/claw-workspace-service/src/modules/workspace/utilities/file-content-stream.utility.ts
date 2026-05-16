import type { Response } from 'express';

import type { FileContentStream } from '../types/workspace.types';

// v3 round 11 (2026-05-14) — Prompt 08: pipe a provider FileContentStream
// straight to the Express response. The web ReadableStream from `fetch`
// is drained chunk-by-chunk so a large file never buffers fully in
// node memory.
//
// Wrapped in a utility (not inline in the controller) per the
// library-wrapping + 3-line-controller rules — the controller calls
// this one function.
export async function streamFileContentToResponse(
  stream: FileContentStream,
  res: Response,
): Promise<void> {
  res.setHeader('Content-Type', stream.mimeType);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${encodeRfc5987(stream.filename)}"`,
  );
  if (stream.sizeBytes !== null && Number.isFinite(stream.sizeBytes)) {
    res.setHeader('Content-Length', String(stream.sizeBytes));
  }
  // Defensive: a workspace file is never a same-origin script, so block
  // content-type sniffing.
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const reader = stream.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value !== undefined) {
        res.write(Buffer.from(value));
      }
    }
    res.end();
  } catch (error) {
    // If headers are already sent we can't switch to a JSON error — just
    // terminate the response so the client sees a truncated download
    // rather than a hang.
    if (!res.headersSent) {
      res.status(502).json({
        statusCode: 502,
        message: 'workspace.object.download.stream_failed',
        detail: error instanceof Error ? error.message : 'unknown',
      });
    } else {
      res.end();
    }
  } finally {
    reader.releaseLock();
  }
}

// RFC 5987-ish filename encoding for Content-Disposition — strips quotes
// and control chars, percent-encodes the rest. Good enough for the
// `filename="..."` form; ASCII-only filenames pass through unchanged.
function encodeRfc5987(filename: string): string {
  return filename
    .replace(/["\\\r\n]/g, '_')
    .replace(/[^ -~]/g, (c) => encodeURIComponent(c));
}
