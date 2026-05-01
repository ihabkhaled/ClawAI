import { Injectable, Logger } from '@nestjs/common';

import { AiActionKind, AiActionPrivacyClass } from '../../../common/enums/ai-action-kind.enum';
import { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';
import { AiActionApprovalManager } from '../../ai-actions/managers/ai-action-approval.manager';
import {
  DIGEST_FALLBACK_NOTIFICATION_REGEX,
  DIGEST_HIGHLIGHT_KEYWORD_PATTERNS,
} from '../constants/digest.constants';
import { DigestRepository } from '../repositories/digest.repository';
import type { DigestSection } from '../types/digest.types';

/**
 * Stream 31.3 — once a digest snapshot is generated, scan its sections for
 * implicit action items and convert each into an `AiActionApprovalQueue`
 * entry. The snapshot is updated with the resulting queue ids so the UI can
 * surface "click to approve" buttons.
 */
@Injectable()
export class DigestActionItemExtractorManager {
  private readonly logger = new Logger(DigestActionItemExtractorManager.name);

  constructor(
    private readonly approval: AiActionApprovalManager,
    private readonly repo: DigestRepository,
  ) {}

  async extract(input: {
    snapshotId: string;
    userId: string;
    sections: DigestSection[];
    snapshotDate: Date;
  }): Promise<{ queueIds: string[] }> {
    this.logger.debug(
      `extract: snapshotId=${input.snapshotId} sections=${String(input.sections.length)}`,
    );
    const queueIds: string[] = [];
    for (const section of input.sections) {
      for (const highlight of section.highlights) {
        const kind = this.classifyHighlight(highlight);
        if (kind === null) continue;
        try {
          const result = await this.approval.enqueueSuggestion({
            userId: input.userId,
            connectorId: null,
            actionKind: kind,
            provider: this.normalizeProvider(section.provider),
            draftPayload: {
              sourceSection: section.provider,
              sourceHighlight: highlight,
              context: `Digest action item from ${section.provider}: ${highlight}`,
              date: input.snapshotDate.toISOString(),
              privacyClass: AiActionPrivacyClass.INTERNAL,
            },
            generatedBy: { mode: 'AUTO', source: 'digest_action_item_extractor' },
          });
          queueIds.push(result.queueId);
        } catch (error) {
          this.logger.warn(
            `extract: failed for highlight="${highlight.slice(0, 80)}" — ${error instanceof Error ? error.message : 'unknown'}`,
          );
        }
      }
    }
    if (queueIds.length > 0) {
      await this.repo.linkActionItemSuggestions(input.snapshotId, queueIds);
    }
    this.logger.log(
      `extract: snapshotId=${input.snapshotId} created ${String(queueIds.length)} queue entries`,
    );
    return { queueIds };
  }

  private classifyHighlight(highlight: string): AiActionKind | null {
    const trimmed = highlight.trim();
    if (trimmed.length < 3) return null;
    for (const { regex, kind } of DIGEST_HIGHLIGHT_KEYWORD_PATTERNS) {
      if (regex.test(trimmed)) {
        return kind;
      }
    }
    if (DIGEST_FALLBACK_NOTIFICATION_REGEX.test(trimmed)) {
      return AiActionKind.SUMMARIZE;
    }
    return null;
  }

  private normalizeProvider(rawProvider: string): WorkspaceProvider | null {
    const upper = rawProvider.toUpperCase();
    const valid = Object.values(WorkspaceProvider) as string[];
    return valid.includes(upper) ? (upper as WorkspaceProvider) : null;
  }
}
