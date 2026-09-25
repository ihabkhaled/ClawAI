import { type AddressInfo, createServer, type Server, type Socket } from 'node:net';
import {
  clamErrorCode,
  computeClamBackoffMs,
  isTransientClamError,
  sendInstream,
  sendPing,
} from '../clamav-scanner.utility';
import {
  CLAMAV_EMPTY_REPLY_ERROR_CODE,
  CLAMAV_RETRY_MAX_DELAY_MS,
} from '../../constants/clamav.constants';

// A real TCP server on 127.0.0.1 stands in for clamd, so the wire protocol,
// the empty-reply case and ECONNREFUSED are exercised on an actual socket.

const openSockets = new Set<Socket>();

const listen = (onConnection: (socket: Socket) => void): Promise<Server> =>
  new Promise((resolve) => {
    const server = createServer((socket) => {
      openSockets.add(socket);
      socket.on('close', () => openSockets.delete(socket));
      onConnection(socket);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });

const portOf = (server: Server): number => (server.address() as AddressInfo).port;

const close = (server: Server): Promise<void> =>
  new Promise((resolve) => {
    for (const socket of openSockets) {
      socket.destroy();
    }
    server.close(() => resolve());
  });

describe('clamav-scanner utility (real socket)', () => {
  it('sendPing returns PONG from a clamd-like server', async () => {
    const server = await listen((socket) => {
      socket.on('data', (data) => {
        if (data.toString() === 'zPING\0') {
          socket.end('PONG\0');
        }
      });
    });
    await expect(sendPing('127.0.0.1', portOf(server), 1_000)).resolves.toBe('PONG');
    await close(server);
  });

  it('sendInstream streams size-prefixed data and returns the verdict', async () => {
    let received = Buffer.alloc(0);
    const server = await listen((socket) => {
      socket.on('data', (data: Buffer) => {
        received = Buffer.concat([received, data]);
        if (received.subarray(-4).equals(Buffer.alloc(4, 0))) {
          socket.end('stream: OK\0');
        }
      });
    });
    await expect(
      sendInstream('127.0.0.1', portOf(server), Buffer.from('abc'), 1_000),
    ).resolves.toBe('stream: OK');
    expect(received.subarray(0, 10).toString()).toBe('zINSTREAM\0');
    expect(received.readUInt32BE(10)).toBe(3);
    await close(server);
  });

  it('a connection closed with no reply is a transient CLAMAV_EMPTY_REPLY', async () => {
    const server = await listen((socket) => socket.end());
    const error: unknown = await sendPing('127.0.0.1', portOf(server), 1_000).catch(
      (caught: unknown) => caught,
    );
    expect(clamErrorCode(error)).toBe(CLAMAV_EMPTY_REPLY_ERROR_CODE);
    expect(isTransientClamError(error)).toBe(true);
    await close(server);
  });

  it('a closed port is a transient ECONNREFUSED', async () => {
    const server = await listen(() => {
      // accept and never answer
    });
    const port = portOf(server);
    await close(server);
    const error: unknown = await sendPing('127.0.0.1', port, 1_000).catch(
      (caught: unknown) => caught,
    );
    expect(clamErrorCode(error)).toBe('ECONNREFUSED');
    expect(isTransientClamError(error)).toBe(true);
  });

  it('a server that never answers times out as transient ETIMEDOUT', async () => {
    const server = await listen(() => {
      // accept and never answer
    });
    const error: unknown = await sendPing('127.0.0.1', portOf(server), 100).catch(
      (caught: unknown) => caught,
    );
    expect(clamErrorCode(error)).toBe('ETIMEDOUT');
    expect(isTransientClamError(error)).toBe(true);
    await close(server);
  });

  it('classifies unknown errors as non-transient', () => {
    expect(isTransientClamError(new Error('x'))).toBe(false);
    expect(clamErrorCode('nope')).toBe('UNKNOWN');
  });

  it('backs off exponentially and caps', () => {
    expect(computeClamBackoffMs(1)).toBe(1_000);
    expect(computeClamBackoffMs(2)).toBe(2_000);
    expect(computeClamBackoffMs(3)).toBe(4_000);
    expect(computeClamBackoffMs(10)).toBe(CLAMAV_RETRY_MAX_DELAY_MS);
  });
});
