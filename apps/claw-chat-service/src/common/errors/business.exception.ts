import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessException extends HttpException {
  public readonly code: string;
  public readonly messageKey: string | undefined;

  constructor(
    message: string,
    code: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    messageKey?: string,
  ) {
    super(
      {
        message,
        code,
        statusCode: status,
        ...(messageKey === undefined ? {} : { messageKey }),
      },
      status,
    );
    this.code = code;
    this.messageKey = messageKey;
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
