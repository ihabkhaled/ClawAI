import type { FigmaDesignMetadata } from '../types/figma.types';

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

function resolveComponentCount(metadata: Record<string, unknown>): number | null {
  if (typeof metadata['componentCount'] === 'number') {
    return metadata['componentCount'];
  }
  return null;
}

export function extractFigmaMetadata(metadata: Record<string, unknown>): FigmaDesignMetadata {
  return {
    fileKey: typeof metadata['fileKey'] === 'string' ? metadata['fileKey'] : '',
    nodeId: typeof metadata['nodeId'] === 'string' ? metadata['nodeId'] : null,
    thumbnailUrl: typeof metadata['thumbnailUrl'] === 'string' ? metadata['thumbnailUrl'] : null,
    lastModifiedBy: resolveLastModifiedBy(metadata),
    teamName: typeof metadata['teamName'] === 'string' ? metadata['teamName'] : null,
    projectName: typeof metadata['projectName'] === 'string' ? metadata['projectName'] : null,
    componentCount: resolveComponentCount(metadata),
    webUrl: resolveWebUrl(metadata),
  };
}
