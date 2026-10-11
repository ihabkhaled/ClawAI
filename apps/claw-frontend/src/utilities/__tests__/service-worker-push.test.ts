import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

import { describe, expect, it, vi } from 'vitest';

type Listener = (event: unknown) => void;

/** Runs public/sw.js against a fake worker scope and hands back what it registered. */
function loadWorker() {
  const listeners = new Map<string, Listener>();
  const showNotification = vi.fn().mockResolvedValue(undefined);
  const openWindow = vi.fn().mockResolvedValue(undefined);
  const matchAll = vi.fn().mockResolvedValue([]);
  const scope = {
    location: new URL('https://claw.example/sw.js?v=1'),
    addEventListener: (type: string, listener: Listener) => listeners.set(type, listener),
    registration: { showNotification },
    clients: { matchAll, openWindow, claim: vi.fn() },
    skipWaiting: vi.fn(),
  };
  const source = readFileSync(path.join(process.cwd(), 'public', 'sw.js'), 'utf8');
  vm.runInNewContext(source, { self: scope, URL, caches: {}, fetch: vi.fn(), Response });
  return { listeners, showNotification, openWindow, matchAll };
}

function pushEvent(payload: unknown) {
  const waits: Promise<unknown>[] = [];
  return {
    event: {
      data: { json: () => payload },
      waitUntil: (promise: Promise<unknown>) => waits.push(promise),
    },
    done: () => Promise.all(waits),
  };
}

describe('service worker push handling', () => {
  it('shows the notification with the localized text and a prefixed portal path', async () => {
    const { listeners, showNotification } = loadWorker();
    const { event, done } = pushEvent({
      title: 'Your Thread is now public',
      body: 'Readers can open it now.',
      link: '/threads/my-slug',
      lang: 'fr',
      tag: 'k1',
    });
    listeners.get('push')?.(event);
    await done();
    expect(showNotification).toHaveBeenCalledWith(
      'Your Thread is now public',
      expect.objectContaining({
        body: 'Readers can open it now.',
        tag: 'k1',
        data: { path: '/fr/threads/my-slug' },
      }),
    );
  });

  it('drops a malformed message and never opens an off-site link', async () => {
    const { listeners, showNotification } = loadWorker();
    const bad = pushEvent({ nope: true });
    listeners.get('push')?.(bad.event);
    await bad.done();
    expect(showNotification).not.toHaveBeenCalled();

    const offsite = pushEvent({ title: 't', link: '//evil.example/x', lang: 'en' });
    listeners.get('push')?.(offsite.event);
    await offsite.done();
    expect(showNotification).toHaveBeenCalledWith(
      't',
      expect.objectContaining({ data: { path: '/en' } }),
    );
  });

  it('opens the link in a new window when none is open, on this origin only', async () => {
    const { listeners, openWindow } = loadWorker();
    const waits: Promise<unknown>[] = [];
    listeners.get('notificationclick')?.({
      notification: { close: vi.fn(), data: { path: '/en/threads/a' } },
      waitUntil: (promise: Promise<unknown>) => waits.push(promise),
    });
    await Promise.all(waits);
    expect(openWindow).toHaveBeenCalledWith('https://claw.example/en/threads/a');
  });
});
