import { Injectable, Logger } from '@nestjs/common';
import { type ConnectorModel } from '../../../generated/prisma';
import { SNAPSHOT_VIDEO_INPUT_MODALITY } from '../constants/models-snapshot.constants';
import { ConnectorModelsRepository } from '../repositories/connector-models.repository';
import {
  snapshotSupportsAudio,
  snapshotSupportsVideoInput,
} from '../utilities/snapshot-media-capability.utility';
import {
  type ConnectorModelsSnapshotResult,
  type UpstreamModelSnapshotEntry,
} from '../types/connectors.types';

/// Phase 6 — builds the snapshot consumed by the routing-service's
/// RouterSyncManager. Returns only enabled connectors' ACTIVE models so
/// the router never proposes disabled/deprecated providers.
@Injectable()
export class ModelsSnapshotManager {
  private readonly logger = new Logger(ModelsSnapshotManager.name);

  constructor(private readonly modelsRepo: ConnectorModelsRepository) {}

  async build(): Promise<ConnectorModelsSnapshotResult> {
    this.logger.debug('build: collecting connector models snapshot for routing-service');
    const rows = await this.modelsRepo.findAllForSnapshot();
    const models: UpstreamModelSnapshotEntry[] = rows.map((row) => this.toSnapshotEntry(row));
    this.logger.log(`build: returning ${models.length} models for routing snapshot`);
    return {
      models,
      generatedAt: new Date().toISOString(),
    };
  }

  private toSnapshotEntry(row: ConnectorModel): UpstreamModelSnapshotEntry {
    const modalitiesIn: string[] = ['TEXT'];
    const modalitiesOut: string[] = ['TEXT'];
    if (row.supportsVision) modalitiesIn.push('IMAGE_INPUT');
    // Media flags go through the same fail-closed heuristic the sync uses, so
    // a row written before that heuristic cannot advertise audio it lacks.
    if (snapshotSupportsAudio(row)) modalitiesIn.push('AUDIO');
    // routing-service's Prisma `ModalityKind` spells this VIDEO_INPUT; a bare
    // 'VIDEO' is not a member and would fail that row's registry upsert.
    if (snapshotSupportsVideoInput(row)) modalitiesIn.push(SNAPSHOT_VIDEO_INPUT_MODALITY);
    return {
      provider: row.provider,
      modelKey: row.modelKey,
      displayName: row.displayName,
      isLocal: false,
      modalitiesIn,
      modalitiesOut,
      contextWindowTokens: row.maxContextTokens ?? undefined,
      exposure: row.exposure,
      kind: row.kind,
    };
  }
}
