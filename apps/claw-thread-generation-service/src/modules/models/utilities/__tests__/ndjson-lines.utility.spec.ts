import { readNdjsonLines } from '../ndjson-lines.utility';

const encoder = new TextEncoder();

function streamOf(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
}

async function collect(
  body: ReadableStream<Uint8Array>,
  onBytes: () => void = vi.fn(),
  signal: AbortSignal = new AbortController().signal,
): Promise<unknown[]> {
  const lines: unknown[] = [];
  for await (const line of readNdjsonLines(body, { onBytes, signal })) lines.push(line);
  return lines;
}

describe('readNdjsonLines', () => {
  it('reads several lines delivered in one chunk', async () => {
    const body = streamOf([encoder.encode('{"a":1}\n{"b":2}\n')]);

    await expect(collect(body)).resolves.toEqual([{ a: 1 }, { b: 2 }]);
  });

  it('joins a line split across chunks, even in the middle of a token', async () => {
    const body = streamOf([
      encoder.encode('{"type":"act'),
      encoder.encode('ivity"}\n{"type":"res'),
      encoder.encode('ult","data":{"n":1}'),
      encoder.encode('}\n'),
    ]);

    await expect(collect(body)).resolves.toEqual([
      { type: 'activity' },
      { type: 'result', data: { n: 1 } },
    ]);
  });

  it('joins a multi-byte character split across two chunks', async () => {
    const bytes = encoder.encode('{"text":"café 中"}\n');
    const cut = bytes.indexOf(0xc3) + 1;

    const lines = await collect(streamOf([bytes.slice(0, cut), bytes.slice(cut)]));

    expect(lines).toEqual([{ text: 'café 中' }]);
  });

  it('reads a last line that has no trailing newline and skips blank lines', async () => {
    const body = streamOf([encoder.encode('\n{"a":1}\n\r\n{"b":2}')]);

    await expect(collect(body)).resolves.toEqual([{ a: 1 }, { b: 2 }]);
  });

  it('reports every chunk of bytes, including one that holds no complete line', async () => {
    const onBytes = vi.fn();
    const body = streamOf([encoder.encode('{"a"'), encoder.encode(':1}\n')]);

    await collect(body, onBytes);

    expect(onBytes).toHaveBeenCalledTimes(2);
  });

  it('refuses a line that is not JSON without echoing it', async () => {
    const body = streamOf([encoder.encode('secret provider text\n')]);

    const failure = await collect(body).catch((error: unknown) => error);

    expect(failure).toHaveProperty('message', 'Chat model stream was malformed');
  });

  it('refuses a line that never ends', async () => {
    const body = streamOf([encoder.encode('x'.repeat(8_000_001))]);

    await expect(collect(body)).rejects.toThrow('Chat model stream was malformed');
  });

  it('cancels the reader when the consumer stops early', async () => {
    const cancel = vi.fn();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('{"a":1}\n{"b":2}\n'));
      },
      cancel,
    });

    for await (const line of readNdjsonLines(body, {
      onBytes: vi.fn(),
      signal: new AbortController().signal,
    })) {
      expect(line).toEqual({ a: 1 });
      break;
    }

    expect(cancel).toHaveBeenCalledOnce();
  });

  it('ends a pending read when the signal aborts', async () => {
    const cancel = vi.fn();
    const body = new ReadableStream<Uint8Array>({ cancel });
    const controller = new AbortController();

    const reading = collect(body, vi.fn(), controller.signal);
    controller.abort();

    await expect(reading).resolves.toEqual([]);
    expect(cancel).toHaveBeenCalled();
  });
});
