import { type ArgumentsHost, BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { GlobalExceptionFilter } from '../global-exception.filter';

describe('GlobalExceptionFilter code passthrough', () => {
  it('keeps the code of a plain HttpException response body', () => {
    const json = vi.fn();
    const response = { headersSent: false, status: vi.fn(() => ({ json })) };
    const host = {
      switchToHttp: () => ({ getResponse: () => response }),
    } as unknown as ArgumentsHost;
    new GlobalExceptionFilter().catch(
      new BadRequestException({ message: 'Validation failed', code: 'X_CODE', errors: {} }),
      host,
    );
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: 'X_CODE', statusCode: 400 }));
  });
});
