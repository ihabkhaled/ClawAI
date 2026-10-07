import { describeFailure } from '../describe-failure.utility';

describe('describeFailure', () => {
  it('reports the error and its cause', () => {
    const error = new Error('An author role failed', { cause: new Error('Model window unknown') });
    expect(describeFailure(error)).toBe(
      'Error: An author role failed <- Error: Model window unknown',
    );
  });

  it('reports a thrown non-error without leaking it', () => {
    expect(describeFailure({ secret: 'x' })).toBe('non-error thrown');
  });

  it('truncates long messages', () => {
    expect(describeFailure(new Error('x'.repeat(500))).length).toBeLessThan(230);
  });
});
