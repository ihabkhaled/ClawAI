import { webcrypto } from 'node:crypto';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEVICE_ID_STORAGE_KEY } from '@/constants/bot-check.constants';
import {
  collectDevicePayload,
  getOrCreateDeviceId,
  readDeviceSignals,
  resetDevicePayloadCache,
  sha256Hex,
} from '@/lib/bot-check/device-fingerprint';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

const originalGetContext = Object.getOwnPropertyDescriptor(
  HTMLCanvasElement.prototype,
  'getContext',
);
const originalToDataUrl = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'toDataURL');

/** jsdom has no canvas: a fake 2D context and a fake WebGL context with debug info. */
function fakeCanvasContexts(): void {
  const gl = {
    VENDOR: 1,
    RENDERER: 2,
    getExtension: () => ({}),
    getParameter: (name: number) => (name === 0x9245 ? 'Fake GPU Inc.' : 'Fake Renderer 3000'),
  };
  const ctx2d = { fillRect: vi.fn(), fillText: vi.fn() };
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: (type: string) => (type === 'webgl' ? gl : ctx2d),
  });
  Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
    configurable: true,
    value: () => 'data:image/png;base64,AAA',
  });
}

function restoreCanvas(): void {
  if (originalGetContext) {
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', originalGetContext);
  }
  if (originalToDataUrl) {
    Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', originalToDataUrl);
  }
}

describe('device fingerprint', () => {
  beforeEach(() => {
    vi.stubGlobal('crypto', webcrypto);
    window.localStorage.clear();
    resetDevicePayloadCache();
    fakeCanvasContexts();
  });
  afterEach(() => {
    restoreCanvas();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('hashes with SHA-256 to 64 lower-case hex characters', async () => {
    await expect(sha256Hex('abc')).resolves.toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('returns a 64-hex fingerprint, a UUID device id and the contract signal shape', async () => {
    const payload = await collectDevicePayload();
    expect(payload).not.toBeNull();
    expect(payload?.fingerprint).toMatch(/^[0-9a-f]{64}$/u);
    expect(payload?.deviceId).toMatch(UUID);
    expect(payload?.signals).toMatchObject({
      tz: expect.any(String),
      lang: expect.any(String),
      screen: expect.stringMatching(/^\d+x\d+x\d+$/u),
      webgl: 'Fake GPU Inc.|Fake Renderer 3000',
      touch: expect.any(Boolean),
    });
  });

  it('is stable: the same browser produces the same fingerprint and device id', async () => {
    const first = await collectDevicePayload();
    resetDevicePayloadCache();
    const second = await collectDevicePayload();
    expect(second?.fingerprint).toBe(first?.fingerprint);
    expect(second?.deviceId).toBe(first?.deviceId);
    expect(window.localStorage.getItem(DEVICE_ID_STORAGE_KEY)).toBe(first?.deviceId);
  });

  it('changes when a signal changes', async () => {
    const first = await collectDevicePayload();
    resetDevicePayloadCache();
    vi.spyOn(navigator, 'hardwareConcurrency', 'get').mockReturnValue(97);
    const second = await collectDevicePayload();
    expect(second?.fingerprint).not.toBe(first?.fingerprint);
  });

  it('keeps one in-memory device id when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const first = getOrCreateDeviceId();
    expect(first).toMatch(UUID);
    expect(getOrCreateDeviceId()).toBe(first);
  });

  it('reads the signals in a fixed order so the hash is reproducible', () => {
    expect(Object.keys(readDeviceSignals())).toEqual([
      'tz',
      'lang',
      'platform',
      'screen',
      'cores',
      'memory',
      'webgl',
      'touch',
    ]);
  });

  it('returns null, not a throw, when the browser cannot hash', async () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'x' });
    await expect(collectDevicePayload()).resolves.toBeNull();
  });
});
