import type { TranslateFunction } from '../types/i18n.types';
import type { PullRequestMetadata } from '../types/source-control.types';
import type { WorkspaceObject } from '../types/workspace.types';

function resolveStringField(
  metadata: Record<string, unknown>,
  primary: string,
  fallback: string,
): string {
  if (typeof metadata[primary] === 'string') {
    return metadata[primary] as string;
  }
  if (typeof metadata[fallback] === 'string') {
    return metadata[fallback] as string;
  }
  return '';
}

export function getPrStateLabel(state: string, t: TranslateFunction): string {
  if (state === 'merged') {
    return t('source_control.pr.state_merged');
  }
  if (state === 'closed') {
    return t('source_control.pr.state_closed');
  }
  return t('source_control.pr.state_open');
}

/**
 * Dedupe `WorkspaceObject` rows by `(provider, externalId)`. Multiple
 * connectors can sync the same upstream PR/issue and end up writing one row
 * each (the rows are unique by `(connector_id, external_id)` in Postgres),
 * so the unfiltered list query naturally returns N copies. We keep whichever
 * copy has the most recent `externalUpdatedAt`.
 */
export function dedupeWorkspaceObjectsByProviderAndExternalId(
  objects: WorkspaceObject[],
): WorkspaceObject[] {
  const seen = new Map<string, WorkspaceObject>();
  for (const obj of objects) {
    const key = `${obj.provider}:${obj.externalId}`;
    const existing = seen.get(key);
    if (existing === undefined) {
      seen.set(key, obj);
      continue;
    }
    const a = obj.externalUpdatedAt ?? '';
    const b = existing.externalUpdatedAt ?? '';
    if (a > b) seen.set(key, obj);
  }
  return Array.from(seen.values());
}

export function extractPrMetadata(metadata: Record<string, unknown>): PullRequestMetadata {
  const reviewers = Array.isArray(metadata['reviewers']) ? (metadata['reviewers'] as string[]) : [];
  const labels = Array.isArray(metadata['labels']) ? (metadata['labels'] as string[]) : [];
  const numberRaw = metadata['number'] ?? metadata['iid'];
  const additionsRaw = metadata['additions'];
  const deletionsRaw = metadata['deletions'];

  return {
    number: typeof numberRaw === 'number' ? numberRaw : null,
    state: typeof metadata['state'] === 'string' ? metadata['state'] : 'open',
    author: typeof metadata['author'] === 'string' ? metadata['author'] : '',
    sourceBranch: resolveStringField(metadata, 'sourceBranch', 'head'),
    targetBranch: resolveStringField(metadata, 'targetBranch', 'base'),
    reviewers,
    additions: typeof additionsRaw === 'number' ? additionsRaw : null,
    deletions: typeof deletionsRaw === 'number' ? deletionsRaw : null,
    labels,
    isDraft: metadata['isDraft'] === true || metadata['draft'] === true,
    reviewState: typeof metadata['reviewState'] === 'string' ? metadata['reviewState'] : null,
  };
}
