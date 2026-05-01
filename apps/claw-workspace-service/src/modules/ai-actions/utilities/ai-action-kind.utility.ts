import { HttpStatus } from '@nestjs/common';

import { AiActionKind } from '../../../common/enums/ai-action-kind.enum';
import { BusinessException } from '../../../common/errors/business.exception';

export function parseAiActionKind(raw: string): AiActionKind {
  const valid = Object.values(AiActionKind) as string[];
  if (valid.includes(raw)) {
    return raw as AiActionKind;
  }
  throw new BusinessException(
    'workspace.aiActions.invalidActionKind',
    'INVALID_ACTION_KIND',
    HttpStatus.BAD_REQUEST,
    { raw },
  );
}
