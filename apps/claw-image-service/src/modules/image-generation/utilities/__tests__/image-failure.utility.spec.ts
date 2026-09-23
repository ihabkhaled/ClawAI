import { HttpStatus } from '@nestjs/common';
import { BillingErrorCode } from '@claw/shared-types';

import { ImageFailureCode } from '../../../../common/enums';
import { BusinessException } from '../../../../common/errors';
import { imageFailure } from '../../adapter.utilities/provider-error.utility';
import { imageFailureMessage } from '../../constants/image-failure.constants';
import { describeImageFailure, isChainTerminalFailureCode } from '../image-failure.utility';

describe('describeImageFailure', () => {
  it('stores the fixed sentence for a classified provider refusal, never the provider text', () => {
    const error = new BusinessException(
      'xAI image generation failed: key sk-live-SECRET is revoked',
      ImageFailureCode.PROVIDER_AUTH_FAILED,
    );
    const described = describeImageFailure(error);
    expect(described.errorCode).toBe(ImageFailureCode.PROVIDER_AUTH_FAILED);
    expect(described.errorMessage).toBe(imageFailureMessage(ImageFailureCode.PROVIDER_AUTH_FAILED));
    expect(described.errorMessage).not.toContain('SECRET');
    expect(described.isCreditFailure).toBe(false);
  });

  it('tells a storage failure apart from a provider failure', () => {
    const described = describeImageFailure(
      imageFailure(ImageFailureCode.STORAGE_FAILED, 'connect ECONNREFUSED 172.18.0.36:4006'),
    );
    expect(described.errorCode).toBe('IMAGE_STORAGE_FAILED');
    expect(described.errorMessage).not.toContain('ECONNREFUSED');
  });

  it('keeps credit refusals as they were', () => {
    const described = describeImageFailure(
      new BusinessException(
        'x',
        BillingErrorCode.PAYG_CREDIT_EXHAUSTED,
        HttpStatus.PAYMENT_REQUIRED,
      ),
    );
    expect(described.isCreditFailure).toBe(true);
  });

  it('falls back to PROVIDER_FAILURE for anything unclassified', () => {
    expect(describeImageFailure(new Error('boom')).errorCode).toBe('PROVIDER_FAILURE');
    expect(describeImageFailure(new BusinessException('x', 'SOME_OTHER')).errorCode).toBe(
      'PROVIDER_FAILURE',
    );
  });
});

describe('isChainTerminalFailureCode', () => {
  it('stops the AUTO chain only for failures another provider cannot avoid', () => {
    expect(isChainTerminalFailureCode('IMAGE_STORAGE_FAILED')).toBe(true);
    expect(isChainTerminalFailureCode('IMAGE_MODEL_UNAVAILABLE')).toBe(false);
    expect(isChainTerminalFailureCode(null)).toBe(false);
  });
});
