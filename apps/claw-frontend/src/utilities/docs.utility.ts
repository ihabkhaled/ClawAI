import type { DocFileMetadata } from '../types/docs.types';

function resolveOwner(metadata: Record<string, unknown>): string | null {
  if (typeof metadata['owner'] === 'string') {
    return metadata['owner'];
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
  if (typeof metadata['modifiedBy'] === 'string') {
    return metadata['modifiedBy'];
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

function resolveFileSize(metadata: Record<string, unknown>): number | null {
  if (typeof metadata['fileSize'] === 'number') {
    return metadata['fileSize'];
  }
  if (typeof metadata['size'] === 'number') {
    return metadata['size'];
  }
  return null;
}

export function extractDocMetadata(metadata: Record<string, unknown>): DocFileMetadata {
  const sharedWith = Array.isArray(metadata['sharedWith'])
    ? (metadata['sharedWith'] as string[])
    : [];

  return {
    mimeType: typeof metadata['mimeType'] === 'string' ? metadata['mimeType'] : '',
    fileSize: resolveFileSize(metadata),
    owner: resolveOwner(metadata),
    lastModifiedBy: resolveLastModifiedBy(metadata),
    sharedWith,
    webUrl: resolveWebUrl(metadata),
    driveId: typeof metadata['driveId'] === 'string' ? metadata['driveId'] : null,
    parentPath: typeof metadata['parentPath'] === 'string' ? metadata['parentPath'] : null,
  };
}

export function resolveDocDate(
  externalUpdatedAt: string | null,
  externalCreatedAt: string | null,
): string {
  if (externalUpdatedAt !== null) {
    return new Date(externalUpdatedAt).toLocaleDateString();
  }
  if (externalCreatedAt !== null) {
    return new Date(externalCreatedAt).toLocaleDateString();
  }
  return '';
}

export function formatFileSize(bytes: number | null): string {
  if (bytes === null) {
    return '';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
