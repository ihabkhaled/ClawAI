import { ServiceUnavailableException } from '@nestjs/common';

import { describeFailure } from '../describe-failure.utility';

describe('describeFailure', () => {
  it('reports a service error and its cause with the text this service wrote', () => {
    const error = new ServiceUnavailableException('An author role failed', {
      cause: new ServiceUnavailableException('Model context window is unknown'),
    });

    expect(describeFailure(error)).toBe(
      'ServiceUnavailableException: An author role failed <- ServiceUnavailableException: Model context window is unknown',
    );
  });

  it('keeps only the class name of an error this service did not write', () => {
    const error = new Error('connect ECONNREFUSED 10.0.0.5:5432 password=hunter2');

    expect(describeFailure(error)).toBe('Error');
    expect(describeFailure(error)).not.toContain('hunter2');
  });

  it('does the same for the cause of a service error', () => {
    const error = new ServiceUnavailableException('An author role failed', {
      cause: new Error('upstream said: secret-token-123'),
    });

    expect(describeFailure(error)).toBe(
      'ServiceUnavailableException: An author role failed <- Error',
    );
  });

  it('reports a thrown non-error without leaking it', () => {
    expect(describeFailure({ secret: 'x' })).toBe('non-error thrown');
  });

  it('truncates a long service message', () => {
    expect(describeFailure(new ServiceUnavailableException('x'.repeat(500))).length).toBeLessThan(
      260,
    );
  });
});
