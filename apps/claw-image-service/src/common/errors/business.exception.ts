import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessException extends HttpException {
  public readonly code: string;

  constructor(message: string, code: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super({ message, code, statusCode: status }, status);
    this.code = code;
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
