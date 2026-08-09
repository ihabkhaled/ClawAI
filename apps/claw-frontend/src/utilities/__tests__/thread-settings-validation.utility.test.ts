import { describe, expect, it } from 'vitest';

import { ThreadSettingsError } from '@/enums';
import {
  validateMaxReRouteAttempts,
  validateMaxTokens,
  validateQualityThreshold,
} from '@/utilities/thread-settings-validation.utility';

describe('validateMaxTokens', () => {
  it('treats an empty string as unset and therefore valid', () => {
    expect(validateMaxTokens('')).toBeNull();
  });

  it.each(['1', '4096', '32000'])('accepts in-range integer %s', (value) => {
    expect(validateMaxTokens(value)).toBeNull();
  });

  // The reported bug: values above the schema ceiling were posted anyway, the
  // API answered 400, and the user read the rejected save as "Save does nothing".
  it.each(['0', '32001', '999999', '-5'])('rejects out-of-range value %s', (value) => {
    expect(validateMaxTokens(value)).toBe(ThreadSettingsError.MaxTokensOutOfRange);
  });

  it.each(['1.5', 'abc', '1e999'])('rejects non-integer value %s', (value) => {
    expect(validateMaxTokens(value)).toBe(ThreadSettingsError.MaxTokensNotInteger);
  });
});

describe('validateQualityThreshold', () => {
  it.each([0, 0.4, 0.5, 1])('accepts in-range value %s', (value) => {
    expect(validateQualityThreshold(value)).toBeNull();
  });

  it.each([-0.1, 1.1, Number.NaN])('rejects out-of-range value %s', (value) => {
    expect(validateQualityThreshold(value)).toBe(ThreadSettingsError.QualityThresholdOutOfRange);
  });
});

describe('validateMaxReRouteAttempts', () => {
  it.each([0, 2, 5])('accepts in-range value %s', (value) => {
    expect(validateMaxReRouteAttempts(value)).toBeNull();
  });

  it.each([-1, 6, 2.5])('rejects out-of-range value %s', (value) => {
    expect(validateMaxReRouteAttempts(value)).toBe(
      ThreadSettingsError.MaxReRouteAttemptsOutOfRange,
    );
  });
});
