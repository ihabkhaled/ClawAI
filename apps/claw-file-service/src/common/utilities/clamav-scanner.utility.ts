import { connect, type Socket } from 'node:net';
import {
  CLAMAV_EMPTY_REPLY_ERROR_CODE,
  CLAMAV_INSTREAM_COMMAND,
  CLAMAV_PING_COMMAND,
  CLAMAV_RETRY_BASE_DELAY_MS,
  CLAMAV_RETRY_MAX_DELAY_MS,
  CLAMAV_TIMEOUT_ERROR_CODE,
  CLAMAV_TRANSIENT_ERROR_CODES,
} from '../constants/clamav.constants';
import { ClamavSocketError } from '../errors/clamav-socket.error';

/**
 * The clamd wire protocol, and nothing else: open a socket, send one command,
 * return the reply. Retry, deadline and fail-closed policy live in
 * `ClamavClient` (src/infrastructure/clamav).
 */

/** Stream `buffer` to clamd with INSTREAM and return its verdict line. */
export function sendInstream(
  host: string,
  port: number,
  buffer: Buffer,
  timeoutMs: number,
): Promise<string> {
  return exchange(host, port, timeoutMs, (socket) => {
    socket.write(Buffer.from(CLAMAV_INSTREAM_COMMAND));
    const sizeBuffer = Buffer.alloc(4);
    sizeBuffer.writeUInt32BE(buffer.length, 0);
    socket.write(sizeBuffer);
    socket.write(buffer);
    socket.write(Buffer.alloc(4, 0));
  });
}

/** Send `zPING` and return the reply (`PONG` when clamd is ready). */
export function sendPing(host: string, port: number, timeoutMs: number): Promise<string> {
  return exchange(host, port, timeoutMs, (socket) => {
    socket.write(Buffer.from(CLAMAV_PING_COMMAND));
  });
}

/**
 * True when the error means "clamd is not answering right now" — refused,
 * reset, timed out, closed with no reply — rather than a verdict on the file.
 */
export function isTransientClamError(error: unknown): boolean {
  return (
    CLAMAV_TRANSIENT_ERROR_CODES.has(clamErrorCode(error)) ||
    clamErrorCode(error) === CLAMAV_EMPTY_REPLY_ERROR_CODE
  );
}

/**
 * The error's stable code (`ECONNREFUSED`, …) or `UNKNOWN`. Logs use this, not
 * `error.message`: Node's message embeds the resolved container IP.
 */
export function clamErrorCode(error: unknown): string {
  if (error !== null && typeof error === 'object' && 'code' in error) {
    const { code } = error;
    if (typeof code === 'string' && code.length > 0) {
      return code;
    }
  }
  return 'UNKNOWN';
}

/** Backoff before retry `attempt` (1-based): base × 2^(attempt-1), capped. */
export function computeClamBackoffMs(attempt: number): number {
  const exponent = Math.max(0, attempt - 1);
  return Math.min(CLAMAV_RETRY_MAX_DELAY_MS, CLAMAV_RETRY_BASE_DELAY_MS * 2 ** exponent);
}

function exchange(
  host: string,
  port: number,
  timeoutMs: number,
  send: (socket: Socket) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let settled = false;
    const finish = (error: Error | null): void => {
      if (settled) {
        return;
      }
      settled = true;
      socket.destroy();
      if (error !== null) {
        reject(error);
        return;
      }
      const reply = Buffer.concat(chunks).toString('utf-8').replaceAll('\0', '').trim();
      if (reply.length === 0) {
        // clamd accepted the connection but closed it before replying — seen
        // while it is still loading its database. Transient, not a verdict.
        reject(
          new ClamavSocketError(CLAMAV_EMPTY_REPLY_ERROR_CODE, 'clamd closed without a reply'),
        );
        return;
      }
      resolve(reply);
    };

    const socket: Socket = connect(port, host, () => send(socket));
    socket.on('data', (chunk: Buffer) => chunks.push(chunk));
    socket.on('end', () => finish(null));
    socket.on('close', () => finish(null));
    socket.on('error', (err: Error) => finish(err));
    socket.setTimeout(timeoutMs, () => {
      finish(new ClamavSocketError(CLAMAV_TIMEOUT_ERROR_CODE, 'clamd did not answer in time'));
    });
  });
}
