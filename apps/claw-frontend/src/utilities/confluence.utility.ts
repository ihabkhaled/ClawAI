import type { ConfluencePageMetadata } from '../types/confluence.types';

function resolveAuthor(metadata: Record<string, unknown>): string | null {
  if (typeof metadata['author'] === 'string') {
    return metadata['author'];
  }
  if (typeof metadata['createdBy'] === 'string') {
    return metadata['createdBy'];
  }
  return null;
}

function resolveLastModifiedBy(metadata: Record<string, unknown>): string | null {
  if (typeof metadata['lastModifiedBy'] === 'string') {
    return metadata['lastModifiedBy'];
  }
  if (typeof metadata['updatedBy'] === 'string') {
    return metadata['updatedBy'];
  }
  return null;
}

function resolveWebUrl(metadata: Record<string, unknown>): string | null {
  if (typeof metadata['webUrl'] === 'string') {
    return metadata['webUrl'];
  }
  if (typeof metadata['url'] === 'string') {
    return metadata['url'];
  }
  return null;
}

function resolveVersion(metadata: Record<string, unknown>): number | null {
  if (typeof metadata['version'] === 'number') {
    return metadata['version'];
  }
  return null;
}

export function resolveSpaceLabel(spaceKey: string, spaceName: string): string | null {
  if (spaceName.length > 0) {
    return spaceName;
  }
  if (spaceKey.length > 0) {
    return spaceKey;
  }
  return null;
}

export function extractConfluenceMetadata(
  metadata: Record<string, unknown>,
): ConfluencePageMetadata {
  const labels = Array.isArray(metadata['labels']) ? (metadata['labels'] as string[]) : [];

  return {
    spaceKey: typeof metadata['spaceKey'] === 'string' ? metadata['spaceKey'] : '',
    spaceName: typeof metadata['spaceName'] === 'string' ? metadata['spaceName'] : '',
    author: resolveAuthor(metadata),
    lastModifiedBy: resolveLastModifiedBy(metadata),
    version: resolveVersion(metadata),
    labels,
    parentTitle: typeof metadata['parentTitle'] === 'string' ? metadata['parentTitle'] : null,
    webUrl: resolveWebUrl(metadata),
  };
}
