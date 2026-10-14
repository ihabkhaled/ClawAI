import { Injectable, UnprocessableEntityException } from '@nestjs/common';

import { AuthKind } from '../../../common/enums/auth-kind.enum';
import { CurationErrorCode } from '../../../common/enums/curation-error-code.enum';
import { RiskLevel } from '../../../common/enums/risk-level.enum';
import { TOOL_NAME_PATTERN } from '../../catalog/constants/catalog.constants';
import { HostRulePolicyManager } from '../../host-rules/managers/host-rule-policy.manager';
import { McpClientManager } from '../../mcp-servers/managers/mcp-client.manager';
import { McpToolSnapshotManager } from '../../mcp-servers/managers/mcp-tool-snapshot.manager';
import {
  buildCredentialHeaders,
  resolveCredentialHeaderName,
} from '../../mcp-servers/utilities/credential-header.utility';
import { type ProbeResult, type ProbeTarget } from '../types/curation.types';
import { CuratedManifestManager } from './curated-manifest.manager';

/**
 * The bounded tools/list probe: one handshake and at most four list pages through the egress guard
 * (public hosts only, pinned address, no redirects, size and time caps). The credential, when one is
 * given, rides on this one request and is dropped. Throws McpFailure for a connection problem.
 */
@Injectable()
export class CuratedProbeManager {
  constructor(
    private readonly client: McpClientManager,
    private readonly snapshots: McpToolSnapshotManager,
    private readonly manifests: CuratedManifestManager,
    private readonly policy: HostRulePolicyManager,
  ) {}

  async run(target: ProbeTarget, signal?: AbortSignal): Promise<ProbeResult> {
    const url = this.manifests.checkUrl(target.url);
    await this.policy.assertAllowed({ host: url.hostname });
    const headers = this.headersFor(target);
    const started = Date.now();
    const discovery = await this.client.discover({ url: url.href, headers }, signal);
    const latencyMs = Date.now() - started;
    const snapshot = this.snapshots.build(discovery.rawTools);
    return {
      serverName: discovery.serverInfo?.name ?? null,
      latencyMs,
      tools: snapshot.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        defaultRisk: RiskLevel.WRITE,
        // A curated tool is called by the name in the manifest, so it must already be a plain name.
        curatable: TOOL_NAME_PATTERN.test(tool.name),
      })),
      skipped: snapshot.skipped.map((tool) => ({ name: tool.name, reason: tool.reason })),
      ignored: snapshot.ignored,
    };
  }

  private headersFor(target: ProbeTarget): Record<string, string> {
    if (target.credential === undefined || target.authKind === AuthKind.NONE) return {};
    const headerName = resolveCredentialHeaderName(target.authKind, target.headerName);
    if (headerName === null) {
      throw new UnprocessableEntityException({
        message: 'That header name cannot carry a credential',
        errorCode: CurationErrorCode.MANIFEST_INVALID,
        errors: ['auth.headerName: not allowed for credentials'],
      });
    }
    return buildCredentialHeaders(target.authKind, headerName, target.credential);
  }
}
