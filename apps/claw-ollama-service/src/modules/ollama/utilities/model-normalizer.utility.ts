import { BYTES_PER_PARAM_4BIT, PARAM_SIZE_REGEX } from '../constants/discovery.constants';
import { FAMILY_TAXONOMY } from '../constants/model-family-taxonomy.constants';
import type { ParsedOllamaName } from '../types/discovery.types';

export function parseOllamaName(input: string): ParsedOllamaName {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    throw new Error('ollamaName cannot be empty');
  }

  const stripped = trimmed.replaceAll(/\s+/g, '');
  const slashParts = stripped.includes('/') ? stripped.split('/') : [stripped];
  const withoutNamespace = slashParts.at(-1) ?? '';

  if (withoutNamespace.length === 0) {
    throw new Error('ollamaName cannot be empty');
  }

  const parts = withoutNamespace.split(':');
  const rawName = parts[0] ?? '';
  const rawTag = parts[1];
  const name = rawName.toLowerCase();
  const tag = (rawTag ?? 'latest').toLowerCase();

  if (name.length === 0) {
    throw new Error('ollamaName cannot be empty');
  }

  return { name, tag };
}

export function buildCanonicalKey(name: string, tag: string | null | undefined): string {
  const cleanName = name.trim().toLowerCase();
  const cleanTag = (tag ?? '').trim().toLowerCase() || 'latest';
  return `${cleanName}:${cleanTag}`;
}

export function extractFamily(name: string): string | null {
  const lower = name.toLowerCase();

  const sorted = [...FAMILY_TAXONOMY].sort((a, b) => b.family.length - a.family.length);

  for (const entry of sorted) {
    for (const alias of entry.aliases) {
      if (lower === alias || lower.startsWith(`${alias}-`) || lower.startsWith(`${alias}:`)) {
        return entry.family;
      }
    }
  }

  for (const entry of FAMILY_TAXONOMY) {
    if (lower.startsWith(entry.family)) {
      return entry.family;
    }
  }

  return null;
}

export function normalizeDisplayName(name: string, tag: string): string {
  const parts = name.split(/[-_]/).map((part) => {
    if (part.length === 0) return part;
    return part.charAt(0).toUpperCase() + part.slice(1);
  });
  const baseName = parts.join(' ');
  if (!tag || tag.toLowerCase() === 'latest') {
    return baseName;
  }
  return `${baseName} ${tag.toUpperCase()}`;
}

export function parseParameterSizeToBytes(paramSize: string): bigint | null {
  if (!paramSize) return null;
  const match = paramSize.trim().match(PARAM_SIZE_REGEX);
  if (match === null) return null;

  const rawValue = match[1];
  const rawUnit = match[2];
  if (rawValue === undefined || rawUnit === undefined) return null;

  const value = Number.parseFloat(rawValue);
  const unit = rawUnit.toLowerCase();

  if (Number.isNaN(value) || value <= 0) return null;

  const multiplier = unit === 'b' ? 1_000_000_000 : 1_000_000;
  const paramCount = value * multiplier;
  const bytes = Math.round(paramCount * BYTES_PER_PARAM_4BIT);
  return BigInt(bytes);
}
