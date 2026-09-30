import { HttpStatus } from '@nestjs/common';

import { BusinessException } from '../../errors/business.exception';
import { describeFetchFailure } from '../describe-fetch-failure.utility';

describe('describeFetchFailure', () => {
  it('says why, not "Business Exception"', () => {
    const error = new BusinessException(
      'research.fetch.failed',
      'FETCH_FAILED',
      HttpStatus.BAD_GATEWAY,
      {
        url: 'https://site.example/x',
        message: 'No fetch strategy could serve /x (1 tried: direct=NOT_FOUND HTTP 404)',
      },
    );

    expect(error.message).toBe('Business Exception');
    expect(describeFetchFailure(error)).toBe(
      'No fetch strategy could serve /x (1 tried: direct=NOT_FOUND HTTP 404)',
    );
  });

  it('falls back to the error code when the exception carries no reason', () => {
    const error = new BusinessException(
      'research.fetch.robotsDisallowed',
      'FETCH_ROBOTS_DISALLOWED',
    );

    expect(describeFetchFailure(error)).toBe('FETCH_ROBOTS_DISALLOWED');
  });

  it('passes an ordinary error message through and survives a non-error', () => {
    expect(describeFetchFailure(new Error('socket hang up'))).toBe('socket hang up');
    expect(describeFetchFailure('nope')).toBe('Unknown error');
  });
});
