import { type EgressBlockReason } from '../../../common/enums/egress-block-reason.enum';
import { type EgressErrorCode } from '../../../common/enums/egress-error-code.enum';

/**
 * An outbound request that was refused or failed. `detail` is for the audit log only: it can name
 * an address or a reason, which must never reach a user (it would tell them what is on our network).
 */
export class EgressError extends Error {
  constructor(
    readonly code: EgressErrorCode,
    readonly detail: string = '',
    readonly reason?: EgressBlockReason,
  ) {
    super(code);
    this.name = 'EgressError';
  }
}
