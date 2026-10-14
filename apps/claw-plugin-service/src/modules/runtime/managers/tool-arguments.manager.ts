import { BadRequestException, Injectable } from '@nestjs/common';

import { InvokeErrorCode } from '../../../common/enums/invoke-error-code.enum';
import {
  applySettingsDefaults,
  validateSettings,
} from '../../installs/utilities/validate-settings.utility';
import { MCP_ARGUMENTS_MAX_BYTES } from '../../mcp-servers/constants/mcp.constants';
import { TOOL_ARGUMENT_LIMITS } from '../constants/runtime.constants';

/**
 * Checks the model-written arguments against the tool's input schema before anything runs or any
 * quota is held. Defaults are filled in, unknown keys are refused unless the schema allows them,
 * and size and depth are capped. The 400 names the failing paths, never the values.
 */
@Injectable()
export class ToolArgumentsManager {
  prepare(schema: Record<string, unknown>, args: Record<string, unknown>): Record<string, unknown> {
    if (this.sizeOf(args) > MCP_ARGUMENTS_MAX_BYTES) {
      throw this.invalid([{ field: '<root>', message: 'TOO_LARGE' }]);
    }
    const merged = applySettingsDefaults(schema, args);
    const violations = validateSettings(schema, merged, TOOL_ARGUMENT_LIMITS);
    if (violations.length > 0) {
      throw this.invalid(
        violations.map((violation) => ({
          field: violation.path === '' ? '<root>' : violation.path,
          message: violation.issue,
        })),
      );
    }
    return merged;
  }

  private sizeOf(args: Record<string, unknown>): number {
    try {
      return Buffer.byteLength(JSON.stringify(args), 'utf8');
    } catch {
      return Number.POSITIVE_INFINITY;
    }
  }

  private invalid(errors: Array<{ field: string; message: string }>): BadRequestException {
    return new BadRequestException({
      message: 'The tool arguments are not valid',
      errorCode: InvokeErrorCode.ARGUMENTS_INVALID,
      errors,
    });
  }
}
