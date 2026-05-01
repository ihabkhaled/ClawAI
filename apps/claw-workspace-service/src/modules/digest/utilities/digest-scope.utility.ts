import { HttpStatus } from '@nestjs/common';

import { BusinessException } from '../../../common/errors/business.exception';
import type { DigestScope } from '../../../generated/prisma';

const VALID_SCOPES = new Set(['DAILY', 'WEEKLY']);

export function parseDigestScope(raw: string): DigestScope {
  const upper = raw.toUpperCase();
  if (VALID_SCOPES.has(upper)) {
    return upper as DigestScope;
  }
  throw new BusinessException(
    'workspace.digest.invalidScope',
    'INVALID_DIGEST_SCOPE',
    HttpStatus.BAD_REQUEST,
    { scope: raw },
  );
}
