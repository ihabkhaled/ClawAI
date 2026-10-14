import { Injectable } from '@nestjs/common';
import { type AdminServerView, type PluginToolRiskLevel } from '@claw/shared-types';

import { RiskLevel } from '../../../common/enums/risk-level.enum';
import { isPlainRecord } from '../../../common/utilities/is-plain-record.utility';
import {
  QUEUE_RISK_ORDER,
  SERVER_TOOL_TEXT_MAX,
  SERVER_TOOLS_SHOWN_MAX,
} from '../constants/curation.constants';
import { type PendingServerRecord } from '../types/curation.types';

@Injectable()
export class AdminServerPresenterManager {
  /** Host and path only: a query string can carry a token, so it is never shown. */
  toView(record: PendingServerRecord): AdminServerView {
    return {
      id: record.id,
      name: record.name,
      slug: record.slug,
      submitterUserId: record.ownerUserId,
      urlHost: record.urlHost,
      urlPath: this.pathOf(record.url),
      authKind: record.authKind,
      hasCredential: record.hasCredential,
      status: record.status,
      highestRisk: this.highestRisk(record),
      toolCount: record.tools.length,
      tools: record.tools.slice(0, SERVER_TOOLS_SHOWN_MAX).map((tool) => ({
        name: tool.name,
        description: tool.description.slice(0, SERVER_TOOL_TEXT_MAX),
        riskLevel: tool.riskLevel,
      })),
      toolsHash: record.toolsHash,
      serverName:
        isPlainRecord(record.serverInfo) && typeof record.serverInfo['name'] === 'string'
          ? record.serverInfo['name']
          : null,
      createdAt: record.createdAt.toISOString(),
      decidedBy: record.decidedBy,
      decidedAt: record.decidedAt?.toISOString() ?? null,
      decisionReason: record.decisionReason,
    };
  }

  private highestRisk(record: PendingServerRecord): PluginToolRiskLevel {
    return record.tools.reduce<RiskLevel>(
      (highest, tool) =>
        QUEUE_RISK_ORDER.indexOf(tool.riskLevel) > QUEUE_RISK_ORDER.indexOf(highest)
          ? tool.riskLevel
          : highest,
      RiskLevel.READ,
    );
  }

  private pathOf(url: string): string {
    try {
      return new URL(url).pathname;
    } catch {
      return '/';
    }
  }
}
