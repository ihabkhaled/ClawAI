import type { MoneyErrorCode } from './money-error-code.enum';

// Carries a machine-readable code so a service can map the failure onto its own
// BusinessException without string-matching a message.
export class MoneyError extends Error {
  readonly code: MoneyErrorCode;

  constructor(code: MoneyErrorCode, message: string) {
    super(message);
    this.name = 'MoneyError';
    this.code = code;
  }
}
