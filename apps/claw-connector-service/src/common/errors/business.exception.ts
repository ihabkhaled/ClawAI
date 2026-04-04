import { HttpException, HttpStatus } from "@nestjs/common";

export class BusinessException extends HttpException {
  public readonly code: string;

  constructor(message: string, code: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super({ message, code, statusCode: status }, status);
    this.code = code;
  }
}

export class EntityNotFoundException extends BusinessException {
  constructor(entity: string, id: string) {
    super(`${entity} with id '${id}' not found`, "ENTITY_NOT_FOUND", HttpStatus.NOT_FOUND);
  }
}

export class DuplicateEntityException extends BusinessException {
  constructor(entity: string, field: string) {
    super(
      `${entity} with this ${field} already exists`,
      "DUPLICATE_ENTITY",
      HttpStatus.CONFLICT,
    );
  }
}
