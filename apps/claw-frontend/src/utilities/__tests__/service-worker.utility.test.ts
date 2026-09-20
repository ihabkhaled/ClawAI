import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

import { describe, expect, it, vi } from 'vitest';

import {
  isUpdateAlreadySeen,
  serviceWorkerUrl,
  serviceWorkerVersion,
  shouldRegisterServiceWorker,
} from '../service-worker.utility';

describe('serviceWorkerUrl', () => {
  it('carries the version, so a release installs a new worker', () => {
    expect(serviceWorkerUrl('1.108.0')).toBe('/sw.js?v=1.108.0');
  });

  it('escapes anything odd in a version', () => {
    expect(serviceWorkerUrl('1.0.0 beta/2')).toBe('/sw.js?v=1.0.0%20beta%2F2');
  });
});

describe('shouldRegisterServiceWorker', () => {
  // A dev build reuses chunk URLs, so a cached chunk hides the code change.
  it.each([
    ['production', true],
    ['development', false],
    ['test', false],
    [undefined, false],
  ])('%s → %s', (environment, expected) => {
    expect(shouldRegisterServiceWorker(environment)).toBe(expected);
  });
});

/** The real public/sw.js, run with its globals faked (TD-034). */
function loadWorker(version = '1.108.0'): {
  handlers: Map<string, (event: unknown) => void>;
  caches: { store: Map<string, Map<string, Response>>; deleted: string[] };
  fetchMock: ReturnType<typeof vi.fn>;
} {
  const source = readFileSync(path.resolve(__dirname, '..', '..', '..', 'public', 'sw.js'), 'utf8');
  const handlers = new Map<string, (event: unknown) => void>();
  const store = new Map<string, Map<string, Response>>();
  const deleted: string[] = [];
  const cacheFor = (name: string): Map<string, Response> => {
    const existing = store.get(name);
    if (existing) {
      return existing;
    }
    const created = new Map<string, Response>();
    store.set(name, created);
    return created;
  };
  const cachesMock = {
    open: (name: string) =>
      Promise.resolve({
        addAll: () => Promise.resolve(),
        put: (request: Request, response: Response) => {
          cacheFor(name).set(request.url, response);
          return Promise.resolve();
        },
      }),
    keys: () => Promise.resolve([...store.keys()]),
    delete: (name: string) => {
      deleted.push(name);
      store.delete(name);
      return Promise.resolve(true);
    },
    match: (request: Request) => {
      for (const cache of store.values()) {
        const hit = cache.get(request.url);
        if (hit) {
          return Promise.resolve(hit);
        }
      }
      return Promise.resolve(undefined);
    },
  };
  const selfMock = {
    location: { href: `https://claw.local/sw.js?v=${version}`, origin: 'https://claw.local' },
    addEventListener: (type: string, handler: (event: unknown) => void) =>
      handlers.set(type, handler),
    clients: { claim: () => Promise.resolve() },
    skipWaiting: vi.fn(),
  };
  const fetchMock = vi.fn();
  // This repository's own public/sw.js, run with worker globals faked. It is
  // the only way to test the file that actually ships.
  vm.runInNewContext(source, {
    self: selfMock,
    caches: cachesMock,
    fetch: fetchMock,
    URL,
    Response,
  });
  return { handlers, caches: { store, deleted }, fetchMock };
}

const requestFor = (url: string, mode = 'no-cors'): Request =>
  ({ url, method: 'GET', mode }) as unknown as Request;

async function answerFor(
  worker: ReturnType<typeof loadWorker>,
  request: Request,
): Promise<Response | undefined> {
  let answer: Promise<Response> | undefined;
  worker.handlers.get('fetch')?.({
    request,
    respondWith: (value: Promise<Response>) => {
      answer = value;
    },
  });
  return answer ?? undefined;
}

describe('public/sw.js', () => {
  const chunk = 'https://claw.local/_next/static/chunks/main-abc.js';
  const image = 'https://claw.local/icon.png';

  // The whole of TD-034: an old worker answered with a previous build's chunk,
  // so a shipped fix never reached a tab that stayed open.
  it('asks the network for code first, and caches the answer', async () => {
    const worker = loadWorker();
    const fresh = new Response('new code');
    worker.fetchMock.mockResolvedValue(fresh);

    await expect(answerFor(worker, requestFor(chunk))).resolves.toBe(fresh);
    expect(worker.fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to the cached chunk only when the network fails', async () => {
    const worker = loadWorker();
    const cached = new Response('old code');
    worker.caches.store.set('clawai-shell-1.108.0', new Map([[chunk, cached]]));
    worker.fetchMock.mockRejectedValue(new Error('offline'));

    await expect(answerFor(worker, requestFor(chunk))).resolves.toBe(cached);
  });

  it('still serves an image from the cache without asking the network', async () => {
    const worker = loadWorker();
    const cached = new Response('bytes');
    worker.caches.store.set('clawai-shell-1.108.0', new Map([[image, cached]]));
    worker.fetchMock.mockResolvedValue(new Response('other'));

    await expect(answerFor(worker, requestFor(image))).resolves.toBe(cached);
    expect(worker.fetchMock).not.toHaveBeenCalled();
  });

  it('names its cache after the version it was registered with', async () => {
    const worker = loadWorker('9.9.9');
    worker.fetchMock.mockResolvedValue(new Response('code'));

    await answerFor(worker, requestFor(chunk));

    expect([...worker.caches.store.keys()]).toContain('clawai-shell-9.9.9');
  });

  it('deletes every other build cache when it activates', async () => {
    const worker = loadWorker('2.0.0');
    worker.caches.store.set('clawai-shell-1.0.0', new Map());
    worker.caches.store.set('clawai-shell-2.0.0', new Map());
    let activation: Promise<unknown> | undefined;
    worker.handlers.get('activate')?.({
      waitUntil: (value: Promise<unknown>) => {
        activation = value;
      },
    });
    await activation;

    expect(worker.caches.deleted).toEqual(['clawai-shell-1.0.0']);
  });

  it('leaves a POST and another origin alone', async () => {
    const worker = loadWorker();
    const post = { url: chunk, method: 'POST', mode: 'cors' } as unknown as Request;

    await expect(answerFor(worker, post)).resolves.toBeUndefined();
    await expect(
      answerFor(worker, requestFor('https://cdn.example.com/x.js')),
    ).resolves.toBeUndefined();
  });
});

// The update banner used to ask "is a worker waiting", which stays true until
// the update is applied — so it reappeared on every reload for an update the
// person had already declined by reloading past it. These two answer "WHICH
// update is waiting", which is what makes the question askable once.
describe('serviceWorkerVersion', () => {
  it('reads the version a worker script URL carries', () => {
    expect(serviceWorkerVersion('https://claw.local/sw.js?v=1.109.3')).toBe('1.109.3');
  });

  it('is null for a worker with no version, rather than a guess', () => {
    expect(serviceWorkerVersion('https://claw.local/sw.js')).toBeNull();
  });

  it('is null for a URL it cannot parse', () => {
    expect(serviceWorkerVersion('::::')).toBeNull();
  });
});

describe('isUpdateAlreadySeen', () => {
  it('suppresses the update this person was already shown', () => {
    expect(isUpdateAlreadySeen('1.109.3', '1.109.3')).toBe(true);
  });

  it('asks again for a different version', () => {
    expect(isUpdateAlreadySeen('1.110.0', '1.109.3')).toBe(false);
  });

  it('asks when nothing has been seen yet', () => {
    expect(isUpdateAlreadySeen('1.109.3', null)).toBe(false);
  });

  it('never suppresses an unversioned worker, which would hide every update', () => {
    expect(isUpdateAlreadySeen(null, null)).toBe(false);
    expect(isUpdateAlreadySeen(null, '1.109.3')).toBe(false);
  });
});
