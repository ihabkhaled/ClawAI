import { BadGatewayException, type HttpException } from '@nestjs/common';

import { McpErrorCode } from '../../../common/enums/mcp-error-code.enum';
import { McpFailureKind } from '../../../common/enums/mcp-failure-kind.enum';
import { type McpFailure } from '../errors/mcp-failure.error';

/**
 * The only two things a user is ever told about a failed connection. Whether the cause was a
 * private address, a closed port, a TLS refusal or a timeout stays in the audit log.
 */
export function mcpFailureToException(failure: McpFailure): HttpException {
  const rejected =
    failure.kind === McpFailureKind.REJECTED || failure.kind === McpFailureKind.OVERSIZED;
  return new BadGatewayException(
    rejected
      ? {
          message: 'The server answered, but not in a way ClawAI can use',
          errorCode: McpErrorCode.SERVER_REJECTED,
        }
      : {
          message: 'The server could not be reached',
          errorCode: McpErrorCode.SERVER_UNREACHABLE,
        },
  );
}

/** The stable code stored as the server's last error. */
export function mcpFailureErrorCode(failure: McpFailure): McpErrorCode {
  return failure.kind === McpFailureKind.REJECTED || failure.kind === McpFailureKind.OVERSIZED
    ? McpErrorCode.SERVER_REJECTED
    : McpErrorCode.SERVER_UNREACHABLE;
}
