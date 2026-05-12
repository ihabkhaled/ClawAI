import { Logger } from '@nestjs/common';
import { httpRequest } from '../../../common/utilities';
import { SYNC_TIMEOUT_MS } from '../constants/sync.constants';
import { type SnapshotFetchOutcome, type UpstreamModelSnapshot } from '../types/sync.types';

const logger = new Logger('SnapshotFetcher');

/// Calls an upstream snapshot endpoint. Treats 404 as "endpoint not yet
/// implemented on upstream" (not an error) so Phase 6 can ship before the
/// upstream services add the matching controllers.
export async function fetchSnapshot(url: string): Promise<SnapshotFetchOutcome> {
  try {
    const response = await httpRequest<{ models: UpstreamModelSnapshot[] }>({
      url,
      method: 'GET',
      timeoutMs: SYNC_TIMEOUT_MS,
    });
    if (response.status === 404) {
      logger.warn(`snapshot endpoint 404: ${url} — treating as empty (upstream not wired yet)`);
      return { status: 'UPSTREAM_404' };
    }
    if (!response.ok) {
      logger.error(`snapshot endpoint ${url} returned status=${response.status}`);
      return { status: 'UPSTREAM_ERROR', message: `HTTP ${response.status}` };
    }
    const models = Array.isArray(response.data?.models) ? response.data.models : [];
    return { status: 'OK', models };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'unknown';
    logger.error(`snapshot endpoint ${url} threw: ${message}`);
    return { status: 'UPSTREAM_ERROR', message };
  }
}
