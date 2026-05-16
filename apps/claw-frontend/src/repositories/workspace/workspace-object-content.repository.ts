import { API_BASE_URL } from '@/constants';
import { getAccessToken } from '@/utilities';

import type { WorkspaceObjectContent } from '../../types/file-viewer.types';

// v3 round 11 (2026-05-14) — Prompt 08: fetch a workspace object's file
// content as a blob. The backend endpoint streams binary bytes (not
// JSON), so this bypasses apiClient and does a raw authed fetch — same
// pattern as use-authenticated-image. The caller is responsible for
// revoking the returned object URL.
export async function fetchWorkspaceObjectContent(
  objectId: string,
): Promise<WorkspaceObjectContent> {
  const base = API_BASE_URL.replace('/api/v1', '');
  const url = `${base}/api/v1/workspace/objects/${encodeURIComponent(objectId)}/content`;
  const token = getAccessToken();
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token ?? ''}` },
  });
  if (!response.ok) {
    throw new Error(`File download failed: HTTP ${String(response.status)}`);
  }
  const mimeType = response.headers.get('content-type') ?? 'application/octet-stream';
  const disposition = response.headers.get('content-disposition') ?? '';
  const match = /filename="([^"]+)"/.exec(disposition);
  const filename = match?.[1] ?? objectId;
  const blob = await response.blob();
  return {
    blobUrl: URL.createObjectURL(blob),
    mimeType,
    filename,
    sizeBytes: blob.size,
  };
}
