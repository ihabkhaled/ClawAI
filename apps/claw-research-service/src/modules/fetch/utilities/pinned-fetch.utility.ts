import { createBrotliDecompress, createGunzip, createInflate } from 'node:zlib';
import http from 'node:http';
import https from 'node:https';
import { Readable, type Transform } from 'node:stream';
import type { LookupFunction } from 'node:net';

import {
  BODYLESS_STATUSES,
  PINNED_FETCH_ACCEPT_ENCODING,
} from '../../../common/constants/ip-address.constants';
import type { PinnedAddress, PinnedFetchInit } from '../../../common/types/ip-address.types';

/**
 * A `fetch` replacement that connects to ONE pre-validated IP address.
 *
 * The URL keeps its hostname, so `Host:` and the TLS SNI/certificate check are
 * those of the real site; only the `lookup` step is overridden to return the
 * address `resolvePinnedAddress` already approved. Redirects are never followed
 * (the caller does it hop by hop and re-resolves each one).
 */
export function pinnedFetch(
  url: string,
  pin: PinnedAddress,
  init: PinnedFetchInit,
): Promise<Response> {
  const target = new URL(url);
  const transport = target.protocol === 'https:' ? https : http;
  const lookup: LookupFunction = (_host, options, callback) => {
    if (options.all === true) {
      callback(null, [{ address: pin.address, family: pin.family }]);
      return;
    }
    callback(null, pin.address, pin.family);
  };
  return new Promise<Response>((resolve, reject) => {
    const request = transport.request(
      {
        hostname: target.hostname.replace(/^\[/u, '').replace(/\]$/u, ''),
        port: target.port === '' ? undefined : Number.parseInt(target.port, 10),
        path: `${target.pathname}${target.search}`,
        method: 'GET',
        headers: { 'Accept-Encoding': PINNED_FETCH_ACCEPT_ENCODING, ...init.headers },
        signal: init.signal,
        lookup,
      },
      (incoming) => {
        try {
          resolve(toResponse(incoming));
        } catch (error) {
          incoming.destroy();
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      },
    );
    request.on('error', reject);
    request.end();
  });
}

function decoderFor(encoding: string): Transform | null {
  switch (encoding) {
    case 'gzip':
    case 'x-gzip':
      return createGunzip();
    case 'deflate':
      return createInflate();
    case 'br':
      return createBrotliDecompress();
    default:
      return null;
  }
}

function toResponse(incoming: http.IncomingMessage): Response {
  const status = incoming.statusCode ?? 502;
  const headers = new Headers();
  for (let index = 0; index + 1 < incoming.rawHeaders.length; index += 2) {
    headers.append(incoming.rawHeaders[index] ?? '', incoming.rawHeaders[index + 1] ?? '');
  }
  if (BODYLESS_STATUSES.has(status) || status < 200) {
    incoming.resume();
    return new Response(null, { status, headers });
  }
  const encoding = (headers.get('content-encoding') ?? '').trim().toLowerCase();
  const decoder = decoderFor(encoding);
  let source: Readable = incoming;
  if (decoder !== null) {
    headers.delete('content-encoding');
    headers.delete('content-length');
    source = incoming.pipe(decoder);
    incoming.on('error', (error) => source.destroy(error));
  }
  return new Response(Readable.toWeb(source), { status, headers });
}
