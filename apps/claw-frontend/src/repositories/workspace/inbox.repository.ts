import { apiClient } from '../../services/shared/api-client';
import type { InboxPage, SearchResponse } from '../../types/workspace-inbox.types';

const INBOX_BASE = '/workspace/inbox';

export type ListInboxQuery = {
  providers?: string[];
  types?: string[];
  needsAttention?: boolean;
  hasSuggestion?: boolean;
  dateFrom?: string;
  dateTo?: string;
  cursor?: string | null;
  limit?: number;
};

export async function listInbox(query: ListInboxQuery): Promise<InboxPage> {
  const params = new URLSearchParams();
  if (query.providers !== undefined && query.providers.length > 0) {
    params.set('providers', query.providers.join(','));
  }
  if (query.types !== undefined && query.types.length > 0) {
    params.set('types', query.types.join(','));
  }
  if (query.needsAttention === true) {
    params.set('needsAttention', 'true');
  }
  if (query.hasSuggestion === true) {
    params.set('hasSuggestion', 'true');
  }
  if (query.dateFrom !== undefined) {
    params.set('dateFrom', query.dateFrom);
  }
  if (query.dateTo !== undefined) {
    params.set('dateTo', query.dateTo);
  }
  if (query.cursor !== undefined && query.cursor !== null) {
    params.set('cursor', query.cursor);
  }
  if (query.limit !== undefined) {
    params.set('limit', String(query.limit));
  }
  const qs = params.toString();
  const response = await apiClient.get<InboxPage>(`${INBOX_BASE}${qs.length > 0 ? `?${qs}` : ''}`);
  return response.data;
}

export type SearchWorkspaceBody = {
  query: string;
  topK?: number;
  providers?: string[];
};

export async function searchWorkspace(body: SearchWorkspaceBody): Promise<SearchResponse> {
  const response = await apiClient.post<SearchResponse>(`${INBOX_BASE}/search`, body);
  return response.data;
}

export async function setNeedsAttention(
  objectId: string,
  needsAttention: boolean,
): Promise<{ updated: boolean }> {
  const response = await apiClient.patch<{ updated: boolean }>(
    `${INBOX_BASE}/objects/${encodeURIComponent(objectId)}/needs-attention`,
    { needsAttention },
  );
  return response.data;
}
