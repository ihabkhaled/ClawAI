import { createHash } from 'node:crypto';

import {
  EVIDENCE_BUNDLE_MAX_CHARS,
  EVIDENCE_BUNDLE_MAX_ITEMS,
  EVIDENCE_GAP_MAX_NEW_ITEMS,
  PRIVATE_IPV4_PATTERN,
  UNCITABLE_HOST_SUFFIXES,
  UNCITABLE_HOSTS,
} from '../constants/evidence-gap.constants';
import type { EvidenceMerge, RawEvidenceItem } from '../types/evidence-gap.types';
import { normalizeEvidenceUrl } from './citation-id.utility';
import { stableJson } from './stable-json.utility';

function isRecord(value: unknown): value is RawEvidenceItem {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function itemsOf(bundle: Record<string, unknown>): RawEvidenceItem[] {
  const items = bundle['items'];
  return Array.isArray(items) ? items.filter(isRecord) : [];
}

/** Same rules a first-pass source meets: a public http(s) page, no credentials, no internal host. */
export function isCitableEvidenceUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  const host = url.hostname.toLowerCase();
  return (
    (url.protocol === 'https:' || url.protocol === 'http:') &&
    url.username === '' &&
    url.password === '' &&
    !UNCITABLE_HOSTS.has(host) &&
    !UNCITABLE_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix)) &&
    !PRIVATE_IPV4_PATTERN.test(host)
  );
}

function hashOf(bundle: Record<string, unknown>): string {
  return createHash('sha256').update(stableJson(bundle)).digest('hex');
}

/**
 * Adds only the NEW items of a targeted research pass to the bundle the authors already cite.
 * Existing items keep their id, position and text, so every citation written so far still
 * resolves. An item is new when neither its id nor its normalised url is in the bundle; it must
 * be a citable url, the pass adds at most a fixed number, and the bundle never passes its item
 * and size caps. With nothing new the bundle is returned unchanged.
 */
export function mergeEvidenceBundles(
  base: Record<string, unknown>,
  extra: Record<string, unknown>,
): EvidenceMerge {
  const existing = itemsOf(base);
  const ids = new Set(existing.map((item) => String(item['id'])));
  const pages = new Set(existing.map((item) => normalizeEvidenceUrl(String(item['url']))));
  const added: RawEvidenceItem[] = [];
  let size = stableJson(base).length;
  for (const item of itemsOf(extra)) {
    const id = item['id'];
    const url = item['url'];
    if (typeof id !== 'string' || typeof url !== 'string') continue;
    const page = normalizeEvidenceUrl(url);
    if (ids.has(id) || pages.has(page) || !isCitableEvidenceUrl(url)) continue;
    if (added.length >= EVIDENCE_GAP_MAX_NEW_ITEMS) break;
    if (existing.length + added.length >= EVIDENCE_BUNDLE_MAX_ITEMS) break;
    const itemSize = stableJson(item).length;
    if (size + itemSize > EVIDENCE_BUNDLE_MAX_CHARS) continue;
    size += itemSize;
    ids.add(id);
    pages.add(page);
    added.push(item);
  }
  if (added.length === 0) {
    return { bundle: base, sha256: hashOf(base), addedIds: [] };
  }
  const bundle = { ...base, items: [...existing, ...added] };
  return {
    bundle,
    sha256: hashOf(bundle),
    addedIds: added.map((item) => String(item['id'])),
  };
}
