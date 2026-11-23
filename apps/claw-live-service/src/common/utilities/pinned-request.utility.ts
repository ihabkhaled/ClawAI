import { request as httpRequest, type IncomingMessage } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { isIP, type LookupFunction } from 'node:net';

import type { PinnedGetOptions, PinnedGetResult } from './pinned-request.types';

/** Why a pinned GET produced nothing: 'TOO_LARGE' or 'FAILED'. */
export class PinnedRequestError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

/** A DNS lookup that only ever answers with the pre-validated addresses. */
export function pinnedLookup(addresses: readonly string[]): LookupFunction {
  return (_hostname, options, callback) => {
    const entries = addresses.map((address) => ({ address, family: isIP(address) }));
    if (options.all) {
      callback(null, entries);
      return;
    }
    const first = entries[0];
    if (first) callback(null, first.address, first.family);
    else callback(new Error('NO_ADDRESS'), '', 0);
  };
}

function readCapped(response: IncomingMessage, maxBytes: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    response.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBytes) {
        response.destroy();
        reject(new PinnedRequestError('TOO_LARGE'));
        return;
      }
      chunks.push(chunk);
    });
    response.on('end', () => resolve(Buffer.concat(chunks)));
    response.on('error', () => reject(new PinnedRequestError('FAILED')));
  });
}

/**
 * GET (or POST with `options.body`) over a connection pinned to `addresses` (already checked public), so a second DNS
 * answer can never redirect it (no rebinding). The Host header and TLS SNI stay the URL's
 * host, so certificates verify normally. Redirects are not followed: any non-2xx fails.
 */
export function pinnedGet(
  url: URL,
  addresses: readonly string[],
  options: PinnedGetOptions,
): Promise<PinnedGetResult> {
  const send = url.protocol === 'https:' ? httpsRequest : httpRequest;
  return new Promise((resolve, reject) => {
    const req = send(
      url,
      {
        method: options.method ?? 'GET',
        lookup: pinnedLookup(addresses),
        signal: AbortSignal.timeout(options.timeoutMs),
        headers: { accept: '*/*', ...options.headers },
      },
      (response) => {
        const status = response.statusCode ?? 0;
        const declared = Number(response.headers['content-length'] ?? '0');
        if (status < 200 || status >= 300) {
          response.resume();
          reject(new PinnedRequestError('FAILED'));
          return;
        }
        if (declared > options.maxBytes) {
          response.destroy();
          reject(new PinnedRequestError('TOO_LARGE'));
          return;
        }
        const contentType =
          (response.headers['content-type'] ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
        readCapped(response, options.maxBytes).then(
          (body) => resolve({ status, contentType, body }),
          reject,
        );
      },
    );
    req.on('error', (error) =>
      reject(error instanceof PinnedRequestError ? error : new PinnedRequestError('FAILED')),
    );
    req.end(options.body);
  });
}
