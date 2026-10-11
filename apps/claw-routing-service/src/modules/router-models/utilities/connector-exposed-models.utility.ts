import { Logger } from '@nestjs/common';
import { AppConfig } from '../../../app/config/app.config';
import { UPSTREAM_SNAPSHOT_ENDPOINTS } from '../../sync/constants/sync.constants';
import { type ExposedConnectorModel } from '../types/model-cost-catalog.types';
import { fetchSnapshot } from '../../sync/utilities/snapshot-fetcher.utility';

const logger = new Logger('ConnectorExposedModels');

/**
 * Every model the connector currently exposes (its models snapshot), minus
 * local runtimes. Returns [] when the connector is unreachable: the unpriced
 * list then shows registry gaps only, never fails the admin page.
 */
export async function fetchExposedConnectorModels(): Promise<ExposedConnectorModel[]> {
  const base = AppConfig.get().CONNECTOR_SERVICE_URL;
  let host: string;
  try {
    host = new URL(base).host;
  } catch {
    logger.warn('fetchExposedConnectorModels: CONNECTOR_SERVICE_URL is not a valid URL');
    return [];
  }
  const outcome = await fetchSnapshot(
    `${base}${UPSTREAM_SNAPSHOT_ENDPOINTS.CONNECTOR}`,
    new Set([host]),
  );
  if (outcome.status !== 'OK') {
    logger.warn(`fetchExposedConnectorModels: connector snapshot unavailable (${outcome.status})`);
    return [];
  }
  return outcome.models
    .filter((model) => model.isLocal !== true)
    .map((model) => ({
      provider: model.provider,
      modelKey: model.modelKey,
      displayName: model.displayName ?? null,
    }));
}
