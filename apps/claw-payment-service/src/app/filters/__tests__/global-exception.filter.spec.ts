import {
  type ArgumentsHost,
  BadRequestException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { BillingErrorCode } from '@claw/shared-types';

import { BillingException } from '../../../common/errors/billing.exception';
import { BusinessException } from '../../../common/errors/business.exception';
import { GlobalExceptionFilter } from '../global-exception.filter';

type MockResponse = {
  headersSent: boolean;
  status: jest.Mock;
  json: jest.Mock;
};

function buildHost(response: MockResponse): ArgumentsHost {
  return {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;
}

function buildResponse(headersSent = false): MockResponse {
  const response: MockResponse = {
    headersSent,
    status: jest.fn(() => response),
    json: jest.fn(() => response),
  };
  return response;
}

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
    jest.spyOn(filter['logger'], 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('maps a BillingException to its status, code and message key', () => {
    const response = buildResponse();
    filter.catch(
      new BillingException(BillingErrorCode.PAYMENT_AMOUNT_MISMATCH, HttpStatus.CONFLICT),
      buildHost(response),
    );

    expect(response.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.CONFLICT,
        message: 'billing.errors.PAYMENT_AMOUNT_MISMATCH',
        code: 'PAYMENT_AMOUNT_MISMATCH',
      }),
    );
  });

  it('maps a BusinessException the same way', () => {
    const response = buildResponse();
    filter.catch(new BusinessException('k', 'CODE_X'), buildHost(response));
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'k', code: 'CODE_X' }),
    );
  });

  it('passes through a framework HttpException with its validation errors', () => {
    const response = buildResponse();
    filter.catch(
      new BadRequestException({ message: 'Validation failed', errors: [{ field: 'planId' }] }),
      buildHost(response),
    );
    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Validation failed', errors: [{ field: 'planId' }] }),
    );
  });

  it('falls back to the exception message when the response object omits one', () => {
    const response = buildResponse();
    filter.catch(new BadRequestException({ errors: [{ field: 'x' }] }), buildHost(response));
    const body = response.json.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(body['message']).toBe('Bad Request Exception');
    expect(body['errors']).toEqual([{ field: 'x' }]);
  });

  it('handles an HttpException whose response is a plain string', () => {
    const response = buildResponse();
    filter.catch(new NotFoundException('nope'), buildHost(response));
    expect(response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'nope' }));
  });

  it('never leaks an internal error message or stack to the client', () => {
    // An unexpected failure in a payment path could otherwise expose a query,
    // a gateway URL, or a credential fragment.
    const response = buildResponse();
    filter.catch(new Error('connect ECONNREFUSED paypal.internal:443'), buildHost(response));

    expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    const body = response.json.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(body['message']).toBe('Internal server error');
    expect(JSON.stringify(body)).not.toContain('paypal.internal');
  });

  it('logs the stack for an unexpected error so it is still diagnosable', () => {
    const response = buildResponse();
    filter.catch(new Error('boom'), buildHost(response));
    expect(filter['logger'].error).toHaveBeenCalled();
  });

  it('handles a thrown non-Error value', () => {
    const response = buildResponse();
    filter.catch('a string was thrown', buildHost(response));
    expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(filter['logger'].error).toHaveBeenCalled();
  });

  it('writes nothing once headers are already sent', () => {
    // Writing twice would crash the process with ERR_HTTP_HEADERS_SENT.
    const response = buildResponse(true);
    filter.catch(new Error('late'), buildHost(response));
    expect(response.status).not.toHaveBeenCalled();
    expect(response.json).not.toHaveBeenCalled();
  });

  it('always stamps an ISO timestamp', () => {
    const response = buildResponse();
    filter.catch(new BusinessException('k', 'C'), buildHost(response));
    const body = response.json.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(String(body['timestamp'])).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('omits code and errors when neither applies', () => {
    const response = buildResponse();
    filter.catch(new Error('x'), buildHost(response));
    const body = response.json.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(body).not.toHaveProperty('code');
    expect(body).not.toHaveProperty('errors');
  });
});
