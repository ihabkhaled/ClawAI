import { HttpStatus } from '@nestjs/common';
import { BusinessException } from './business.exception';

export class EntityNotFoundException extends BusinessException {
  constructor(entity: string, id: string) {
    super(
      `workspace.${entity.toLowerCase()}.not_found`,
      `${entity.toUpperCase()}_NOT_FOUND`,
      HttpStatus.NOT_FOUND,
      { entity, id },
    );
  }
}
