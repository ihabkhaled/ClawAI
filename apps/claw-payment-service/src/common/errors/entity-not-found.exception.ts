import { HttpStatus } from '@nestjs/common';

import { BusinessException } from './business.exception';

export class EntityNotFoundException extends BusinessException {
  constructor(entity: string, id: string) {
    super(`errors.${entity.toLowerCase()}.notFound`, 'ENTITY_NOT_FOUND', HttpStatus.NOT_FOUND, {
      entity,
      id,
    });
  }
}
