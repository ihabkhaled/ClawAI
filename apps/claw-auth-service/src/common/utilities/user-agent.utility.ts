import {
  BROWSER_RULES,
  DEVICE_KIND_DESKTOP,
  DEVICE_KIND_MOBILE,
  DEVICE_KIND_TABLET,
  DEVICE_KIND_TOOL,
  DEVICE_KIND_UNKNOWN,
  TOOL_RULES,
  UNKNOWN_LABEL_MAX_LENGTH,
  USER_AGENT_MAX_LENGTH,
} from '../constants/user-agent.constants';
import type { ParsedUserAgent } from '../types/parsed-user-agent.type';

function stripControlCharacters(value: string): string {
  let out = '';
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    out += code < 0x20 || code === 0x7f ? ' ' : char;
  }
  return out;
}

function clip(value: string | null, limit: number): string | null {
  if (value === null) return null;
  const cleaned = stripControlCharacters(value).trim();
  return cleaned === '' ? null : cleaned.slice(0, limit);
}

function parseOs(ua: string): string | null {
  if (/\b(?:iPhone|iPad|iPod)\b/.test(ua)) {
    const match = /OS (\d+)[_\d]*/.exec(ua);
    return match?.[1] ? `iOS ${match[1]}` : 'iOS';
  }
  if (/\bAndroid\b/.test(ua)) {
    const match = /Android (\d+)/.exec(ua);
    return match?.[1] ? `Android ${match[1]}` : 'Android';
  }
  if (/\bWindows\b/.test(ua)) return 'Windows';
  if (/\bCrOS\b/.test(ua)) return 'ChromeOS';
  if (/\b(?:Macintosh|Mac OS X)\b/.test(ua)) return 'macOS';
  return /\b(?:Linux|X11)\b/.test(ua) ? 'Linux' : null;
}

function parseDeviceKind(ua: string, hasBrowser: boolean): string {
  if (/\b(?:iPad|Tablet)\b/i.test(ua) || (/\bAndroid\b/.test(ua) && !/\bMobile\b/.test(ua))) {
    return DEVICE_KIND_TABLET;
  }
  if (/\b(?:iPhone|iPod|Mobile)\b/.test(ua)) return DEVICE_KIND_MOBILE;
  return hasBrowser ? DEVICE_KIND_DESKTOP : DEVICE_KIND_UNKNOWN;
}

/**
 * A deliberately small, dependency-free user-agent reader (ADR-204). It is for an
 * administrator's eyes, not for decisions: a spoofed string only changes a label.
 * No AGPL parser is used. The input is clipped and stripped of control characters
 * before it is matched, and every pattern is anchored or bounded.
 */
export function parseUserAgent(raw: string | null | undefined): ParsedUserAgent {
  const ua = clip(raw ?? null, USER_AGENT_MAX_LENGTH);
  if (ua === null) return { os: null, browser: null, deviceKind: DEVICE_KIND_UNKNOWN };

  for (const [name, pattern] of TOOL_RULES) {
    const match = pattern.exec(ua);
    if (match) {
      const label = match[1] ? `${name} ${match[1]}` : name;
      return {
        os: parseOs(ua),
        browser: clip(label, UNKNOWN_LABEL_MAX_LENGTH),
        deviceKind: DEVICE_KIND_TOOL,
      };
    }
  }

  let browser: string | null = null;
  for (const [name, pattern] of BROWSER_RULES) {
    const match = pattern.exec(ua);
    if (match) {
      browser = match[1] ? `${name} ${match[1]}` : name;
      break;
    }
  }
  return {
    os: clip(parseOs(ua), UNKNOWN_LABEL_MAX_LENGTH),
    browser: clip(browser, UNKNOWN_LABEL_MAX_LENGTH),
    deviceKind: parseDeviceKind(ua, browser !== null),
  };
}

/** The raw string as stored: control characters removed, bounded. */
export function clipUserAgent(raw: string | null | undefined): string | null {
  return clip(raw ?? null, USER_AGENT_MAX_LENGTH);
}
