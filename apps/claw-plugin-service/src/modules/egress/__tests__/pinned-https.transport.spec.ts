import { EventEmitter } from 'node:events';
import { type ClientRequest, type IncomingMessage } from 'node:http';
import { type RequestOptions } from 'node:https';
import { Readable } from 'node:stream';

import { EgressErrorCode } from '../../../common/enums/egress-error-code.enum';
import { PinnedHttpsTransport } from '../transports/pinned-https.transport';
import { type EgressSendInput, type PinnedRequestOptions } from '../types/egress.types';

class FakeRequest extends EventEmitter {
  written: string | undefined;
  destroyed = false;

  end(body?: string): void {
    this.written = body;
  }

  destroy(): void {
    this.destroyed = true;
  }
}

class FakeResponse extends Readable {
  statusCode = 200;
  headers: Record<string, string | string[] | undefined> = {
    'content-type': 'application/json',
    'set-cookie': ['a=1', 'b=2'],
  };

  override _read(): void {
    // chunks are pushed by the test
  }
}

class TestTransport extends PinnedHttpsTransport {
  options: PinnedRequestOptions | undefined;
  request = new FakeRequest();
  response = new FakeResponse();
  respond: ((response: FakeResponse) => void) | undefined;
  openRequestNever = false;

  protected override openRequest(
    options: RequestOptions,
    onResponse: (response: IncomingMessage) => void,
  ): ClientRequest {
    this.options = options;
    if (!this.openRequestNever) {
      setImmediate(() => {
        onResponse(this.response as unknown as IncomingMessage);
        this.respond?.(this.response);
      });
    }
    return this.request as unknown as ClientRequest;
  }
}

const INPUT: EgressSendInput = {
  host: 'mcp.example.com',
  port: 443,
  path: '/mcp?x=1',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: '{"a":"é"}',
  address: '93.184.216.34',
  family: 4,
  addresses: [{ address: '93.184.216.34', family: 4 }],
  timeoutMs: 1000,
  maxResponseBytes: 64,
};

function lookupOf(
  transport: TestTransport,
): (host: string, options: { all?: boolean }, cb: (...args: unknown[]) => void) => void {
  return transport.options?.lookup as never;
}

describe('PinnedHttpsTransport', () => {
  it('connects to the host name with TLS checking on, SNI for that name and no connection reuse', async () => {
    const transport = new TestTransport();
    transport.respond = (response) => {
      response.push('{}');
      response.push(null);
    };

    await transport.send(INPUT);

    expect(transport.options).toMatchObject({
      hostname: 'mcp.example.com',
      port: 443,
      path: '/mcp?x=1',
      method: 'POST',
      servername: 'mcp.example.com',
      agent: false,
    });
    expect(transport.options).not.toHaveProperty('rejectUnauthorized');
    expect(transport.options?.headers).toEqual({
      'Content-Type': 'application/json',
      'Content-Length': 10,
    });
    expect(transport.request.written).toBe('{"a":"é"}');
  });

  it('answers every name lookup with the validated address only', async () => {
    const transport = new TestTransport();
    transport.respond = (response) => response.push(null);
    await transport.send(INPUT);
    const lookup = lookupOf(transport);

    const single = vi.fn();
    lookup('anything.example', {}, single);
    const all = vi.fn();
    lookup('anything.example', { all: true }, all);

    expect(single).toHaveBeenCalledWith(null, '93.184.216.34', 4);
    expect(all).toHaveBeenCalledWith(null, [{ address: '93.184.216.34', family: 4 }]);
  });

  it('hands the socket every validated address, in order, with Happy-Eyeballs fallback on', async () => {
    const transport = new TestTransport();
    transport.respond = (response) => response.push(null);
    await transport.send({
      ...INPUT,
      addresses: [
        { address: '93.184.216.34', family: 4 },
        { address: '2606:2800:220:1::1', family: 6 },
        { address: '93.184.216.35', family: 4 },
      ],
    });

    const all = vi.fn();
    lookupOf(transport)('x', { all: true }, all);
    const single = vi.fn();
    lookupOf(transport)('x', {}, single);

    expect(transport.options).toMatchObject({ autoSelectFamily: true });
    expect(transport.options?.autoSelectFamilyAttemptTimeout).toBeGreaterThan(0);
    expect(all).toHaveBeenCalledWith(null, [
      { address: '93.184.216.34', family: 4 },
      { address: '2606:2800:220:1::1', family: 6 },
      { address: '93.184.216.35', family: 4 },
    ]);
    expect(single).toHaveBeenCalledWith(null, '93.184.216.34', 4);
  });

  it('never answers a lookup with an address that was not validated', async () => {
    const transport = new TestTransport();
    transport.respond = (response) => response.push(null);
    await transport.send(INPUT);
    const all = vi.fn();
    lookupOf(transport)('rebind.example', { all: true }, all);
    expect(all).toHaveBeenCalledTimes(1);
    expect(all).toHaveBeenCalledWith(null, [{ address: '93.184.216.34', family: 4 }]);
  });

  it('pins an IPv6 answer', async () => {
    const transport = new TestTransport();
    transport.respond = (response) => response.push(null);
    await transport.send({
      ...INPUT,
      address: '2606:2800:220:1::1',
      family: 6,
      addresses: [{ address: '2606:2800:220:1::1', family: 6 }],
    });

    const single = vi.fn();
    lookupOf(transport)('x', {}, single);

    expect(single).toHaveBeenCalledWith(null, '2606:2800:220:1::1', 6);
  });

  it('returns the status, lowercased and joined headers, and the body', async () => {
    const transport = new TestTransport();
    transport.response.statusCode = 201;
    transport.respond = (response) => {
      response.push('{"ok":');
      response.push('true}');
      response.push(null);
    };

    const result = await transport.send(INPUT);

    expect(result).toEqual({
      status: 201,
      headers: { 'content-type': 'application/json', 'set-cookie': 'a=1, b=2' },
      body: '{"ok":true}',
      truncated: false,
    });
  });

  it('cuts the body at the byte cap and marks it truncated', async () => {
    const transport = new TestTransport();
    transport.respond = (response) => {
      response.push('x'.repeat(100));
    };

    const result = await transport.send(INPUT);

    expect(result.truncated).toBe(true);
    expect(result.body).toHaveLength(64);
  });

  it('keeps multi-byte characters whole across chunk boundaries', async () => {
    const transport = new TestTransport();
    const bytes = Buffer.from('é', 'utf8');
    transport.respond = (response) => {
      response.push(bytes.subarray(0, 1));
      response.push(bytes.subarray(1));
      response.push(null);
    };

    expect((await transport.send(INPUT)).body).toBe('é');
  });

  it('stops reading once the awaited message has arrived', async () => {
    const transport = new TestTransport();
    transport.respond = (response) => {
      response.push('data: {"id":1}\n\n');
    };

    const result = await transport.send({ ...INPUT, stopWhen: (text) => text.includes('"id":1') });

    expect(result.body).toContain('"id":1');
    expect(result.truncated).toBe(false);
  });

  it('rejects with TIMEOUT when the server never answers', async () => {
    vi.useFakeTimers();
    try {
      const transport = new TestTransport();
      transport.openRequestNever = true;
      const pending = transport.send({ ...INPUT, timeoutMs: 500 });
      const assertion = expect(pending).rejects.toMatchObject({ code: EgressErrorCode.TIMEOUT });
      await vi.advanceTimersByTimeAsync(600);
      await assertion;
      expect(transport.request.destroyed).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects with NETWORK carrying only the error code, never the address', async () => {
    const transport = new TestTransport();
    transport.openRequestNever = true;
    const pending = transport.send(INPUT);
    transport.request.emit(
      'error',
      Object.assign(new Error('connect ECONNREFUSED 10.0.0.5:443'), { code: 'ECONNREFUSED' }),
    );

    let error = { code: '', detail: '', message: '' };
    try {
      await pending;
    } catch (caught) {
      error = caught as typeof error;
    }

    expect(error.code).toBe(EgressErrorCode.NETWORK);
    expect(error.detail).toBe('ECONNREFUSED');
    expect(error.message).not.toContain('10.0.0.5');
  });

  it('rejects with ABORTED when the caller aborts, and never starts when already aborted', async () => {
    const live = new TestTransport();
    live.openRequestNever = true;
    const controller = new AbortController();
    const pending = live.send({ ...INPUT, signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: EgressErrorCode.ABORTED });
    expect(live.request.destroyed).toBe(true);

    const early = new TestTransport();
    early.openRequestNever = true;
    const aborted = new AbortController();
    aborted.abort();
    await expect(early.send({ ...INPUT, signal: aborted.signal })).rejects.toMatchObject({
      code: EgressErrorCode.ABORTED,
    });
  });

  it('rejects when the response stream breaks', async () => {
    const transport = new TestTransport();
    transport.respond = (response) => {
      response.emit('error', new Error('reset'));
    };

    await expect(transport.send(INPUT)).rejects.toMatchObject({ code: EgressErrorCode.NETWORK });
  });
});
