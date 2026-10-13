import { HttpStatus } from '@nestjs/common';

import { codedErrorBody } from '../coded-error-body.utility';

describe('codedErrorBody', () => {
  it('carries the message, the machine code and the status in the shared error shape', () => {
    expect(
      codedErrorBody('Not on your plan', 'MODEL_NOT_ALLOWED_FOR_PLAN', HttpStatus.FORBIDDEN),
    ).toEqual({
      message: 'Not on your plan',
      code: 'MODEL_NOT_ALLOWED_FOR_PLAN',
      statusCode: 403,
    });
  });

  it('adds the details but never lets them overwrite message, code or status', () => {
    const body = codedErrorBody('m', 'C', HttpStatus.BAD_REQUEST, {
      role: 'judge',
      message: 'spoofed',
      code: 'SPOOFED',
      statusCode: 200,
    });

    expect(body).toEqual({ role: 'judge', message: 'm', code: 'C', statusCode: 400 });
  });
});
