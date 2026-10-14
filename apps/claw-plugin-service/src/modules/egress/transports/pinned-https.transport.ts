import { request as httpsRequest, type RequestOptions } from 'node:https';
import { type ClientRequest, type IncomingMessage } from 'node:http';
import { StringDecoder } from 'node:string_decoder';
import { Injectable } from '@nestjs/common';

import { EgressErrorCode } from '../../../common/enums/egress-error-code.enum';
import {
  EGRESS_ADDRESS_ATTEMPT_TIMEOUT_MS,
  EGRESS_CONNECT_TIMEOUT_MS,
} from '../constants/egress.constants';
import { EgressError } from '../errors/egress.error';
import {
  type EgressSendInput,
  type EgressSendResult,
  type PinnedRequestOptions,
} from '../types/egress.types';
import { buildPinnedLookup } from '../utilities/build-pinned-lookup.utility';
import { EgressTransport } from './egress.transport';

/**
 * HTTPS to a pinned address. TLS verification is on (the default; nothing here turns it off), the
 * certificate is checked against the real host name, and the socket lookup returns only the
 * validated address. No agent, so no connection outlives the call. The body is read with a hard
 * byte cap and the whole call has one deadline.
 */
@Injectable()
export class PinnedHttpsTransport extends EgressTransport {
  send(input: EgressSendInput): Promise<EgressSendResult> {
    return new Promise<EgressSendResult>((resolve, reject) => {
      const state = { settled: false };
      const timers: NodeJS.Timeout[] = [];
      const finish = (action: () => void): void => {
        if (state.settled) return;
        state.settled = true;
        for (const timer of timers) clearTimeout(timer);
        input.signal?.removeEventListener('abort', onAbort);
        action();
      };
      const request = this.openRequest(this.optionsFor(input), (response) => {
        this.readBody(response, input, (result) => {
          finish(() => {
            resolve(result);
          });
        });
        response.on('error', () => {
          finish(() => {
            reject(new EgressError(EgressErrorCode.NETWORK, 'response error'));
          });
        });
        response.on('aborted', () => {
          finish(() => {
            reject(new EgressError(EgressErrorCode.NETWORK, 'response aborted'));
          });
        });
      });
      const fail = (error: EgressError): void => {
        finish(() => {
          reject(error);
        });
        request.destroy();
      };
      function onAbort(): void {
        fail(new EgressError(EgressErrorCode.ABORTED, 'caller aborted'));
      }
      timers.push(
        setTimeout(() => {
          fail(new EgressError(EgressErrorCode.TIMEOUT, 'deadline'));
        }, input.timeoutMs),
        setTimeout(
          () => {
            fail(new EgressError(EgressErrorCode.TIMEOUT, 'connect deadline'));
          },
          Math.min(EGRESS_CONNECT_TIMEOUT_MS, input.timeoutMs),
        ),
      );
      request.on('socket', (socket) => {
        socket.once('secureConnect', () => {
          const connectTimer = timers.at(1);
          if (connectTimer !== undefined) clearTimeout(connectTimer);
        });
      });
      request.on('error', (error) => {
        fail(
          error instanceof EgressError
            ? error
            : new EgressError(EgressErrorCode.NETWORK, errorCodeOf(error)),
        );
      });
      if (input.signal?.aborted === true) {
        onAbort();
        return;
      }
      input.signal?.addEventListener('abort', onAbort, { once: true });
      request.end(input.body);
    });
  }

  /** The one place a socket is opened. A test replaces it; production uses node:https. */
  protected openRequest(
    options: RequestOptions,
    onResponse: (response: IncomingMessage) => void,
  ): ClientRequest {
    return httpsRequest(options, onResponse);
  }

  private optionsFor(input: EgressSendInput): PinnedRequestOptions {
    const body = input.body === undefined ? undefined : Buffer.byteLength(input.body, 'utf8');
    return {
      hostname: input.host,
      port: input.port,
      path: input.path,
      method: input.method,
      servername: input.host,
      headers: body === undefined ? input.headers : { ...input.headers, 'Content-Length': body },
      lookup: buildPinnedLookup(
        input.addresses.length > 0
          ? input.addresses
          : [{ address: input.address, family: input.family }],
      ),
      autoSelectFamily: true,
      autoSelectFamilyAttemptTimeout: EGRESS_ADDRESS_ATTEMPT_TIMEOUT_MS,
      agent: false,
    };
  }

  private readBody(
    response: IncomingMessage,
    input: EgressSendInput,
    done: (result: EgressSendResult) => void,
  ): void {
    const decoder = new StringDecoder('utf8');
    const state = { text: '', bytes: 0, truncated: false, finished: false };
    const complete = (): void => {
      if (state.finished) return;
      state.finished = true;
      state.text += decoder.end();
      done({
        status: response.statusCode ?? 0,
        headers: flattenHeaders(response.headers),
        body: state.text,
        truncated: state.truncated,
      });
    };
    response.on('data', (chunk: Buffer) => {
      if (state.finished) return;
      const room = input.maxResponseBytes - state.bytes;
      const piece = chunk.length > room ? chunk.subarray(0, Math.max(room, 0)) : chunk;
      state.bytes += piece.length;
      state.text += decoder.write(piece);
      state.truncated = chunk.length > room;
      if (state.truncated || input.stopWhen?.(state.text) === true) {
        complete();
        response.destroy();
      }
    });
    response.on('end', complete);
  }
}

function errorCodeOf(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null;
  return typeof code === 'string' ? code : 'request error';
}

function flattenHeaders(raw: IncomingMessage['headers']): Record<string, string> {
  const headers = new Map<string, string>();
  for (const [name, value] of Object.entries(raw)) {
    if (value !== undefined)
      headers.set(name.toLowerCase(), Array.isArray(value) ? value.join(', ') : value);
  }
  return Object.fromEntries(headers);
}
