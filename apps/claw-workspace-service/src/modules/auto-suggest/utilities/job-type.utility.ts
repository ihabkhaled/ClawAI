import { BadRequestException } from '@nestjs/common';

import { AUTO_SUGGEST_SUPPORTED_JOB_TYPES } from '../constants/auto-suggest.constants';
import type { AutoSuggestJobType } from '../types/auto-suggest.types';

export function parseAutoSuggestJobType(raw: string): AutoSuggestJobType {
  if (!isAutoSuggestJobType(raw)) {
    throw new BadRequestException({ messageKey: 'AUTO_SUGGEST_JOB_TYPE_INVALID' });
  }
  return raw;
}

export function isAutoSuggestJobType(value: string): value is AutoSuggestJobType {
  return (AUTO_SUGGEST_SUPPORTED_JOB_TYPES as ReadonlyArray<string>).includes(value);
}
