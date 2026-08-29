import { HttpException, HttpStatus } from '@nestjs/common';
import { type BusinessExceptionDetails } from '../types/business-exception-details.type';

export class BusinessException extends HttpException {
  public readonly code: string;

  /**
   * `details` carries the few typed numbers an error body is allowed to expose.
   * Optional so every existing caller is unaffected; the exception filter copies
   * whatever is present onto the response, and nothing else.
   */
  constructor(
    message: string,
    code: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: BusinessExceptionDetails,
  ) {
    super({ message, code, statusCode: status, details }, status);
    this.code = code;
  }
}

/**
 * A PAYG request refused for money reasons.
 *
 * Always 402 Payment Required, never 403: the caller can fix this by adding
 * credit, and mapping it to a permission failure would send the user to the
 * wrong page. Carries the two numbers the user needs to act and nothing else —
 * never an internal cost ceiling, a margin, or a provider rate.
 */
export class PaygRejectionException extends BusinessException {
  constructor(code: string, availableMicroUsd: number, requiredMicroUsd: number | null) {
    super('Insufficient pay-as-you-go credit', code, HttpStatus.PAYMENT_REQUIRED, {
      availableMicroUsd,
      requiredMicroUsd,
    });
  }
}

export class EntityNotFoundException extends BusinessException {
  constructor(entity: string, id: string) {
    super(`${entity} with id '${id}' not found`, 'ENTITY_NOT_FOUND', HttpStatus.NOT_FOUND);
  }
}

export class DuplicateEntityException extends BusinessException {
  constructor(entity: string, field: string) {
    super(`${entity} with this ${field} already exists`, 'DUPLICATE_ENTITY', HttpStatus.CONFLICT);
  }
}

export class InvalidCredentialsException extends BusinessException {
  constructor() {
    super('Invalid email or password', 'INVALID_CREDENTIALS', HttpStatus.UNAUTHORIZED);
  }
}

export class AccountSuspendedException extends BusinessException {
  constructor() {
    super('Account is suspended', 'ACCOUNT_SUSPENDED', HttpStatus.FORBIDDEN);
  }
}

export class InvalidRefreshTokenException extends BusinessException {
  constructor() {
    super('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN', HttpStatus.UNAUTHORIZED);
  }
}
