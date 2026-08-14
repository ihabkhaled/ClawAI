import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../../app/config/app.config';
import { httpRequest } from '../../../common/utilities';
import {
  CONNECTOR_MODELS_SNAPSHOT_PATH,
  DISCOVERY_TIMEOUT_MS,
} from '../constants/model-discovery.constants';
import { ModelDiscoveryRepository } from '../repositories/model-discovery.repository';
import type {
  AliasResolutionResult,
  DiscoveredModel,
  DiscoveryImportResult,
  UnresolvedAlias,
} from '../types/model-discovery.types';
import { matchAliasToDeployment } from '../utilities/model-alias-matching.utility';

/**
 * Turns a connector catalogue into routable endpoints and resolves chain
 * aliases against them.
 *
 * This is what makes a seeded chain more than a list of strings: a chain entry
 * carries an alias an admin wrote, and until that alias points at a real
 * ModelDeployment the entry cannot run.
 *
 * Admin-triggered rather than automatic on boot. Discovery writes registry rows
 * and flips endpoints to routable, which is not something that should happen
 * silently as a side effect of a restart.
 */
@Injectable()
export class ModelDiscoveryService {
  private readonly logger = new Logger(ModelDiscoveryService.name);

  constructor(private readonly repository: ModelDiscoveryRepository) {}

  /** Imports the connector catalogue. Returns null if the upstream is unusable. */
  async importFromConnectors(): Promise<DiscoveryImportResult | null> {
    const config = AppConfig.get();
    const url = `${config.CONNECTOR_SERVICE_URL}${CONNECTOR_MODELS_SNAPSHOT_PATH}`;

    try {
      const response = await httpRequest<{ models?: DiscoveredModel[] }>({
        url,
        method: 'GET',
        timeoutMs: DISCOVERY_TIMEOUT_MS,
      });

      if (!response.ok) {
        this.logger.warn(
          `importFromConnectors: connector-service returned ${String(response.status)}`,
        );
        return null;
      }

      const models = response.data.models ?? [];
      this.logger.log(`importFromConnectors: received ${String(models.length)} models`);
      return await this.repository.importModels(models);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`importFromConnectors: failed - ${message}`);
      return null;
    }
  }

  /**
   * Points every chain entry at the endpoint its alias names.
   *
   * An alias matching nothing is REPORTED, not substituted. Quietly resolving a
   * configured `gemini-3.5-flash-lite` to whatever Gemini model happens to
   * exist would leave the admin page showing a chain that is not the one
   * running, and no operator could spot the difference.
   */
  async resolveChainAliases(): Promise<AliasResolutionResult> {
    const [entries, candidates] = await Promise.all([
      this.repository.findUnresolvedChainEntries(),
      this.repository.findAliasCandidates(),
    ]);

    const unresolved: UnresolvedAlias[] = [];
    const linkedDeploymentIds: string[] = [];

    for (const entry of entries) {
      const match = matchAliasToDeployment(entry.modelAlias, entry.provider, candidates);
      if (!match) {
        unresolved.push({
          entryId: entry.id,
          order: entry.order,
          provider: entry.provider,
          alias: entry.modelAlias,
        });
        continue;
      }

      await this.repository.linkChainEntry(entry.id, match.deploymentId);
      linkedDeploymentIds.push(match.deploymentId);
    }

    const activated = await this.repository.activateDeployments(linkedDeploymentIds);

    for (const entry of unresolved) {
      this.logger.warn(
        `resolveChainAliases: entry ${String(entry.order)} alias "${entry.alias}" (${entry.provider}) matched no deployment`,
      );
    }
    this.logger.log(
      `resolveChainAliases: resolved=${String(linkedDeploymentIds.length)} activated=${String(activated)} unresolved=${String(unresolved.length)}`,
    );

    return { resolved: linkedDeploymentIds.length, unresolved };
  }

  /** Import then resolve, the order an operator wants. */
  async run(): Promise<{ imported: DiscoveryImportResult | null; aliases: AliasResolutionResult }> {
    const imported = await this.importFromConnectors();
    const aliases = await this.resolveChainAliases();
    return { imported, aliases };
  }
}
