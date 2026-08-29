import { HttpStatus } from '@nestjs/common';
import { BillingErrorCode } from '@claw/shared-types';

import { BusinessException } from '../../../../common/errors';
import {
  isRuntimeV2CreditPause,
  runtimeV2TerminalReason,
  runtimeV2TerminalStatus,
} from '../runtime-v2-failure.utility';

describe('a coding-agent run pauses when credit runs out (E6)', () => {
  const refusal = new BusinessException(
    'Your pay-as-you-go credit is used up.',
    BillingErrorCode.PAYG_CREDIT_EXHAUSTED,
    HttpStatus.PAYMENT_REQUIRED,
  );

  it('classifies an exhausted wallet as a pause, not a failure', () => {
    expect(isRuntimeV2CreditPause(refusal)).toBe(true);
    expect(runtimeV2TerminalStatus(refusal)).toBe('paused');
  });

  it('keeps every other fault a failure', () => {
    // Dressing these up as a pause would advertise a resume that can never
    // work: topping up does not fix a malformed tool request or a dead provider.
    const cases: unknown[] = [
      new BusinessException(
        'bad tool request',
        'RUNTIME_UNREPAIRABLE',
        HttpStatus.UNPROCESSABLE_ENTITY,
      ),
      new BusinessException(
        'provider down',
        'CLOUD_PROVIDER_REQUEST_FAILED',
        HttpStatus.BAD_GATEWAY,
      ),
      new Error('socket hang up'),
      'a bare string',
    ];
    for (const error of cases) {
      expect(isRuntimeV2CreditPause(error)).toBe(false);
      expect(runtimeV2TerminalStatus(error)).toBe('failed');
    }
  });

  it('carries the credit code on the terminal reason so the client can offer a top-up', () => {
    expect(runtimeV2TerminalReason(refusal)).toEqual({
      code: BillingErrorCode.PAYG_CREDIT_EXHAUSTED,
      message: 'Your pay-as-you-go credit is used up.',
    });
  });
});
