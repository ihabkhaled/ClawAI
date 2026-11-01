import { Injectable, Logger } from '@nestjs/common';
import { HttpMethod } from '@claw/shared-types';
import { httpRequest } from '@claw/shared-utilities';

import { AppConfig } from '../../../app/config/app.config';
import { buildInterServiceAuthHeader } from '../../../common/utilities';
import { ModelExposureClient } from '../clients/model-exposure.client';
import { MODELS_SNAPSHOT_PATH } from '../constants/model-capability.constants';
import {
  MEDIA_CATALOG_CACHE_TTL_MS,
  MEDIA_CATALOG_CONNECTOR_ORDER,
  MEDIA_CATALOG_COST_RANK,
  MEDIA_CATALOG_MAX_CACHE_KEYS,
  MEDIA_CATALOG_PROVIDER_PREFIX,
  MEDIA_CATALOG_TIMEOUT_MS,
  mediaCatalogSnapshotSchema,
} from '../constants/media-catalog.constants';
import { MediaKind } from '../enums/media-kind.enum';
import { AccessControlService } from '../services/access-control.service';
import type {
  MediaAudioKind,
  MediaCatalogRow,
  MediaNamedLookup,
  MediaTarget,
} from '../types/media-tools.types';
import { costClassKey } from '../utilities/model-cost-class-key.utility';
import { kindEntry } from '../utilities/media-tool-definition.utility';

/**
 * The media models a user can actually use right now, built from the same catalog the model picker
 * reads (connector-service's models snapshot: `mediaKind`, `audioKind`, `exposure`), filtered by the
 * user's plan (the picker's own `listModelAccess`) and ordered by provider and cost class.
 *
 * It exists because a fixed (provider, model) list drifts: `gpt-image-1` and `tts-1` do not exist on
 * a given OpenAI account, and the catalog says what does (`chatgpt-image-latest`,
 * `gpt-4o-mini-tts`). One model per provider is offered, so a failure moves to the NEXT provider
 * rather than hammering one provider's other ids. Never throws: a catalog outage returns `null` and
 * the caller falls back to the constants.
 */
@Injectable()
export class MediaCatalogManager {
  private readonly logger = new Logger(MediaCatalogManager.name);
  private readonly exposure = new ModelExposureClient();
  private snapshot: { rows: MediaCatalogRow[] | null; expiresAt: number } | null = null;
  private readonly perUser = new Map<string, { targets: MediaTarget[]; expiresAt: number }>();

  constructor(private readonly accessControl: AccessControlService) {}

  /** The user's best model per provider for this kind, best provider first; `null` if the catalog is down. */
  async candidates(
    userId: string,
    kind: MediaKind,
    audioKind?: MediaAudioKind,
  ): Promise<MediaTarget[] | null> {
    const key = `${userId}:${kind}:${audioKind ?? ''}`;
    const now = Date.now();
    const hit = this.perUser.get(key);
    if (hit !== undefined && hit.expiresAt > now) return hit.targets;
    const rows = await this.loadRows();
    if (rows === null) return null;
    try {
      const targets = await this.pickTargets(userId, kind, audioKind, rows);
      this.remember(key, targets, now);
      return targets;
    } catch (error: unknown) {
      this.logger.warn(
        `candidates: plan or cost lookup failed - ${error instanceof Error ? error.message : 'error'}`,
      );
      return null;
    }
  }

  /**
   * A model id the user named: found in the catalog and allowed by the plan, found but refused by the
   * plan (the SAME `listModelAccess` the candidate list and the picker use), or not listed at all.
   */
  async findNamed(userId: string, kind: MediaKind, name: string): Promise<MediaNamedLookup> {
    const rows = await this.loadRows();
    const wanted = name
      .trim()
      .toLowerCase()
      .replace(/^models\//u, '');
    const row = (rows ?? []).find(
      (candidate) =>
        candidate.mediaKind === kind.toUpperCase() &&
        candidate.modelKey.toLowerCase().replace(/^models\//u, '') === wanted,
    );
    if (row === undefined) return { status: 'unknown' };
    const allowed = await this.isAllowed(userId, row.provider, row.modelKey);
    return allowed ? { status: 'found', target: this.toTarget(row, kind) } : { status: 'denied' };
  }

  /** Whether the user's plan may use this connector model. A lookup failure refuses (fail closed). */
  async isAllowed(userId: string, connector: string, model: string): Promise<boolean> {
    try {
      const access = await this.accessControl.listModelAccess(userId, [
        { provider: connector, model },
      ]);
      return access.at(0)?.allowed === true;
    } catch (error: unknown) {
      this.logger.warn(
        `isAllowed: plan lookup failed, refusing - ${error instanceof Error ? error.message : 'error'}`,
      );
      return false;
    }
  }

  private async pickTargets(
    userId: string,
    kind: MediaKind,
    audioKind: MediaAudioKind | undefined,
    rows: readonly MediaCatalogRow[],
  ): Promise<MediaTarget[]> {
    const order = kindEntry(MEDIA_CATALOG_CONNECTOR_ORDER, kind);
    const eligible = rows.filter(
      (row) =>
        row.mediaKind === kind.toUpperCase() &&
        order.includes(row.provider) &&
        (kind !== MediaKind.AUDIO || audioKind === undefined || row.audioKind === audioKind),
    );
    if (eligible.length === 0) return [];
    const pairs = eligible.map((row) => ({ provider: row.provider, model: row.modelKey }));
    const [access, classes] = await Promise.all([
      this.accessControl.listModelAccess(userId, pairs),
      this.exposure.getCostClasses(pairs),
    ]);
    const allowed = new Set(
      access.filter((entry) => entry.allowed).map((e) => costClassKey(e.provider, e.model)),
    );
    const rank = (row: MediaCatalogRow): number =>
      MEDIA_CATALOG_COST_RANK.get(classes.get(costClassKey(row.provider, row.modelKey)) ?? '') ??
      MEDIA_CATALOG_COST_RANK.size;
    const targets: MediaTarget[] = [];
    for (const connector of order) {
      const best = eligible
        .filter(
          (row) =>
            row.provider === connector && allowed.has(costClassKey(row.provider, row.modelKey)),
        )
        .sort((a, b) => rank(a) - rank(b) || a.modelKey.localeCompare(b.modelKey))
        .at(0);
      if (best !== undefined) targets.push(this.toTarget(best, kind));
    }
    return targets;
  }

  private toTarget(row: MediaCatalogRow, kind: MediaKind): MediaTarget {
    return {
      provider: `${kindEntry(MEDIA_CATALOG_PROVIDER_PREFIX, kind)}${row.provider}`,
      model: row.modelKey.replace(/^models\//u, ''),
    };
  }

  private remember(key: string, targets: MediaTarget[], now: number): void {
    if (this.perUser.size >= MEDIA_CATALOG_MAX_CACHE_KEYS) this.perUser.clear();
    this.perUser.set(key, { targets, expiresAt: now + MEDIA_CATALOG_CACHE_TTL_MS });
  }

  private async loadRows(): Promise<MediaCatalogRow[] | null> {
    const now = Date.now();
    if (this.snapshot !== null && this.snapshot.expiresAt > now) return this.snapshot.rows;
    const rows = await this.fetchRows();
    this.snapshot = { rows, expiresAt: now + MEDIA_CATALOG_CACHE_TTL_MS };
    return rows;
  }

  private async fetchRows(): Promise<MediaCatalogRow[] | null> {
    try {
      const response = await httpRequest<unknown>({
        url: `${AppConfig.get().CONNECTOR_SERVICE_URL}${MODELS_SNAPSHOT_PATH}`,
        method: HttpMethod.GET,
        headers: { Authorization: buildInterServiceAuthHeader() },
        timeoutMs: MEDIA_CATALOG_TIMEOUT_MS,
      });
      const parsed = response.ok ? mediaCatalogSnapshotSchema.safeParse(response.data) : null;
      return !parsed?.success
        ? null
        : (parsed.data.models.filter(
            (row) =>
              row.mediaKind !== undefined &&
              (row.exposure === undefined || row.exposure === 'EXPOSED'),
          ) as MediaCatalogRow[]);
    } catch {
      return null;
    }
  }
}
