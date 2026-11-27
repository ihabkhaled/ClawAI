import {
  DEVICE_CANVAS_HEIGHT,
  DEVICE_CANVAS_TEXT,
  DEVICE_CANVAS_WIDTH,
  DEVICE_ID_STORAGE_KEY,
  WEBGL_UNMASKED_RENDERER,
  WEBGL_UNMASKED_VENDOR,
} from '@/constants/bot-check.constants';
import type { DevicePayload, DeviceSignals } from '@/types/bot-check.types';

/**
 * Device fingerprint for the one-free-trial-per-device rule (2026-11-27).
 * No third-party library: SHA-256 (crypto.subtle) over stable browser signals
 * plus a canvas-rendering hash, and a random UUID kept in localStorage.
 *
 * Nothing here is secret. The server peppers and hashes both values before
 * storing them, and never stores the raw signals as an identifier.
 */

let cachedPayload: Promise<DevicePayload | null> | null = null;
let memoryDeviceId: string | null = null;

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Lower-case hex SHA-256 of a UTF-8 string (64 characters). */
export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return toHex(digest);
}

function readDeviceMemory(): number | undefined {
  const value: unknown = Reflect.get(navigator, 'deviceMemory');
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readWebglIdentity(): string | undefined {
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    if (gl === null) {
      return undefined;
    }
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const vendor: unknown = gl.getParameter(debugInfo === null ? gl.VENDOR : WEBGL_UNMASKED_VENDOR);
    const renderer: unknown = gl.getParameter(
      debugInfo === null ? gl.RENDERER : WEBGL_UNMASKED_RENDERER,
    );
    return `${String(vendor)}|${String(renderer)}`;
  } catch {
    return undefined;
  }
}

/** The stable signals, in a fixed key order so the hash is reproducible. */
export function readDeviceSignals(): DeviceSignals {
  const screenInfo =
    typeof screen === 'undefined'
      ? undefined
      : `${screen.width}x${screen.height}x${screen.colorDepth}`;
  return {
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    lang: (navigator.languages.length > 0 ? navigator.languages : [navigator.language]).join(','),
    platform: navigator.platform,
    screen: screenInfo,
    cores: Number.isFinite(navigator.hardwareConcurrency)
      ? navigator.hardwareConcurrency
      : undefined,
    memory: readDeviceMemory(),
    webgl: readWebglIdentity(),
    touch: navigator.maxTouchPoints > 0 || 'ontouchstart' in window,
  };
}

/** Hash of a small text drawing: fonts, anti-aliasing and GPU differ per device. */
async function hashCanvas(): Promise<string> {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = DEVICE_CANVAS_WIDTH;
    canvas.height = DEVICE_CANVAS_HEIGHT;
    const context = canvas.getContext('2d');
    if (context === null) {
      return '';
    }
    context.textBaseline = 'top';
    context.font = '16px Arial';
    context.fillStyle = '#f60';
    context.fillRect(4, 4, 120, 30);
    context.fillStyle = '#069';
    context.fillText(DEVICE_CANVAS_TEXT, 6, 8);
    return await sha256Hex(canvas.toDataURL());
  } catch {
    return '';
  }
}

/** The random per-browser id. Falls back to a per-page id when storage is blocked. */
export function getOrCreateDeviceId(): string {
  try {
    const stored = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (stored !== null && stored.length > 0) {
      return stored;
    }
    const created = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, created);
    return created;
  } catch {
    memoryDeviceId ??= crypto.randomUUID();
    return memoryDeviceId;
  }
}

async function computeDevicePayload(): Promise<DevicePayload> {
  const signals = readDeviceSignals();
  const canvas = await hashCanvas();
  const fingerprint = await sha256Hex(JSON.stringify({ ...signals, canvas }));
  return { fingerprint, deviceId: getOrCreateDeviceId(), signals };
}

/**
 * The `device` object for register and login, computed once per page. `null`
 * when the browser cannot hash (no crypto.subtle outside a secure context): the
 * request still goes out, and the server treats the device as unknown.
 */
export function collectDevicePayload(): Promise<DevicePayload | null> {
  if (typeof crypto === 'undefined' || crypto.subtle === undefined) {
    return Promise.resolve(null);
  }
  cachedPayload ??= computeDevicePayload().catch(() => null);
  return cachedPayload;
}

/** Test seam: forget the cached payload and the in-memory id. */
export function resetDevicePayloadCache(): void {
  cachedPayload = null;
  memoryDeviceId = null;
}
