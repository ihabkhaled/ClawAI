import { Injectable } from '@nestjs/common';

import { ConsentDecision } from '../../../common/enums/consent-decision.enum';
import { RiskLevel } from '../../../common/enums/risk-level.enum';
import { type ConsentVerdict } from '../types/invoke.types';

/**
 * Does this call need the user's yes? The rules, in order:
 *
 * 1. READ never asks.
 * 2. `userApproved` (the user said yes to THIS call) lets it through.
 * 3. A tainted turn (an untrusted tool result is already in the model context) asks for every
 *    non-READ call, whatever was granted before: a poisoned result must not be able to spend a
 *    standing "always allow".
 * 4. DESTRUCTIVE asks every time.
 * 5. WRITE asks until the user has stored a grant for that tool.
 */
@Injectable()
export class ConsentGateManager {
  decide(input: {
    riskLevel: RiskLevel;
    consentGranted: boolean;
    tainted: boolean;
    userApproved: boolean;
  }): ConsentVerdict {
    if (input.riskLevel === RiskLevel.READ) {
      return { required: false, decision: ConsentDecision.NOT_REQUIRED };
    }
    if (input.userApproved) {
      return { required: false, decision: ConsentDecision.APPROVED_THIS_CALL };
    }
    if (input.tainted) return { required: true, decision: ConsentDecision.REQUIRED_TAINTED };
    if (input.riskLevel === RiskLevel.DESTRUCTIVE) {
      return { required: true, decision: ConsentDecision.REQUIRED_EVERY_CALL };
    }
    return input.consentGranted
      ? { required: false, decision: ConsentDecision.STORED_GRANT }
      : { required: true, decision: ConsentDecision.REQUIRED_FIRST_USE };
  }
}
