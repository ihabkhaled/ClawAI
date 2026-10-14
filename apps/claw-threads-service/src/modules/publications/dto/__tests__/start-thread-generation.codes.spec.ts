import { BadRequestException } from '@nestjs/common';

import { ZodValidationPipe } from '../../../../app/pipes/zod-validation.pipe';
import { ThreadGenerationErrorCode } from '../../../../common/enums/thread-generation-error-code.enum';
import { startThreadGenerationSchema } from '../start-thread-generation.dto';

const role = (id: string) => ({
  id,
  provider: 'provider',
  model: 'model',
  maxOutputTokens: 512,
  fallbacks: [],
});
const valid = {
  capMicroUsd: 2_000_000,
  sourceThreadId: 'thread-1',
  idempotencyKey: 'request-1',
  correlationId: 'correlation-1',
  publicIntentVersion: 'threads-public-v1',
  contentLocale: 'en',
  topic: 'A detailed research subject that is at least ten characters',
  publicationType: 'article',
  authors: [role('a1'), role('a2'), role('a3')],
  judge: role('judge'),
  critic: role('critic'),
};

function codeOf(body: unknown): string {
  const pipe = new ZodValidationPipe(
    startThreadGenerationSchema,
    ThreadGenerationErrorCode.REQUEST_INVALID,
  );
  try {
    pipe.transform(body, { type: 'body' });
  } catch (error: unknown) {
    if (!(error instanceof BadRequestException)) throw error;
    const response = error.getResponse();
    return typeof response === 'object' && 'code' in response ? String(response.code) : 'NO_CODE';
  }
  return 'NO_ERROR';
}

describe('every start validation failure carries a THREAD_* code', () => {
  it.each([
    ['spend cap 0', { capMicroUsd: 0 }, ThreadGenerationErrorCode.SPEND_CAP_TOO_LOW],
    [
      'two authors',
      { authors: [role('a1'), role('a2')] },
      ThreadGenerationErrorCode.AUTHOR_COUNT_INVALID,
    ],
    [
      'six authors',
      { authors: ['1', '2', '3', '4', '5', '6'].map(role) },
      ThreadGenerationErrorCode.AUTHOR_COUNT_INVALID,
    ],
    ['bad locale', { contentLocale: 'xx' }, ThreadGenerationErrorCode.LOCALE_INVALID],
    ['bad type', { publicationType: 'poem' }, ThreadGenerationErrorCode.PUBLICATION_TYPE_INVALID],
    ['missing key', { idempotencyKey: undefined }, ThreadGenerationErrorCode.REQUEST_INVALID],
    ['unknown field', { extra: 1 }, ThreadGenerationErrorCode.REQUEST_INVALID],
  ])('%s', (_name, patch, code) => {
    expect(codeOf({ ...valid, ...patch })).toBe(code);
  });

  it('accepts a valid request', () => {
    expect(codeOf(valid)).toBe('NO_ERROR');
  });
});
