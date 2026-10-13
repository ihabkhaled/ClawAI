import { ServiceUnavailableException } from '@nestjs/common';

import {
  DeterministicGenerationError,
  isDeterministicGenerationError,
} from '../deterministic-generation.error';

describe('isDeterministicGenerationError', () => {
  it('recognises the error itself and keeps it a 503 with its message', () => {
    const error = new DeterministicGenerationError('A model role configuration is invalid');

    expect(isDeterministicGenerationError(error)).toBe(true);
    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect(error.name).toBe('DeterministicGenerationError');
    expect(error.message).toBe('A model role configuration is invalid');
  });

  it('finds it through the cause chain of a wrapper', () => {
    const wrapper = new ServiceUnavailableException('An author role failed', {
      cause: new DeterministicGenerationError('Complete role context exceeds the model window'),
    });

    expect(isDeterministicGenerationError(wrapper)).toBe(true);
  });

  it('is false for transient errors and for values that are not errors', () => {
    expect(isDeterministicGenerationError(new Error('Model catalog is unreachable'))).toBe(false);
    expect(
      isDeterministicGenerationError(new Error('wrapper', { cause: new Error('plain') })),
    ).toBe(false);
    expect(isDeterministicGenerationError('Model catalog rejected')).toBe(false);
    expect(isDeterministicGenerationError(null)).toBe(false);
  });

  it('stops walking a cause chain that is deeper than the bound', () => {
    let chain: Error = new DeterministicGenerationError('too deep');
    for (let depth = 0; depth < 10; depth += 1) chain = new Error('wrapper', { cause: chain });

    expect(isDeterministicGenerationError(chain)).toBe(false);
  });
});
