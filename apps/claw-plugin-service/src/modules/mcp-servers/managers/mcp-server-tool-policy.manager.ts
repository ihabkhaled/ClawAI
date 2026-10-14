import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { McpErrorCode } from '../../../common/enums/mcp-error-code.enum';
import { RiskLevel } from '../../../common/enums/risk-level.enum';
import { type ToolPatchBody } from '../dto/mcp-server.dto';
import { type ServerToolRecord } from '../types/mcp-server.types';
import { type PlannedToolUpdate } from '../types/tool-update.types';

/**
 * Decides what an owner may change on a tool of their own server, before anything is written.
 * Every tool starts as WRITE with no stored consent; the owner may mark it READ (their own call),
 * switch it off, or grant a WRITE tool a standing consent. DESTRUCTIVE is asked on every call
 * and never stores one. Changing the risk clears any consent granted for the old risk.
 */
@Injectable()
export class McpServerToolPolicyManager {
  plan(tools: readonly ServerToolRecord[], patches: readonly ToolPatchBody[]): PlannedToolUpdate[] {
    const byName = new Map(tools.map((tool) => [tool.localName, tool]));
    const seen = new Set<string>();
    return patches.map((patch) => {
      const tool = byName.get(patch.name);
      if (tool === undefined) throw this.notFound();
      if (seen.has(patch.name))
        throw this.badRequest(McpErrorCode.TOOL_NOT_FOUND, 'Duplicate tool');
      seen.add(patch.name);
      return { localName: patch.name, update: this.updateFor(tool, patch) };
    });
  }

  private updateFor(tool: ServerToolRecord, patch: ToolPatchBody): PlannedToolUpdate['update'] {
    const riskLevel = patch.riskLevel ?? tool.riskLevel;
    const riskChanged = riskLevel !== tool.riskLevel;
    if (patch.consent === true && riskLevel !== RiskLevel.WRITE) {
      throw this.badRequest(
        McpErrorCode.CONSENT_NOT_ALLOWED,
        'Only a WRITE tool can hold a standing consent',
      );
    }
    const consentGranted = patch.consent ?? (riskChanged ? false : tool.consentGranted);
    return {
      ...(patch.enabled === undefined ? {} : { enabled: patch.enabled }),
      ...(riskChanged ? { riskLevel } : {}),
      ...(consentGranted === tool.consentGranted ? {} : { consentGranted }),
    };
  }

  private notFound(): NotFoundException {
    return new NotFoundException({
      message: 'That tool is not on this server',
      errorCode: McpErrorCode.TOOL_NOT_FOUND,
    });
  }

  private badRequest(errorCode: McpErrorCode, message: string): BadRequestException {
    return new BadRequestException({ message, errorCode });
  }
}
