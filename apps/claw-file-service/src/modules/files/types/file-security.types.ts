import { type ClamScanOutcome } from '../../../common/enums/clam-scan-outcome.enum';

export type ClamScanResult = {
  clean: boolean;
  outcome: ClamScanOutcome;
  /** Stable, host-free reason: `clean`, a signature name, `antivirus_unavailable`, … */
  reason: string;
};

export type FileValidationResult = {
  valid: boolean;
  reason: string;
};

export type FileSecurityCheckResult = {
  passed: boolean;
  checks: FileSecurityCheck[];
  /**
   * True when the ONLY thing between this file and acceptance is that clamd
   * could not be reached before the deadline. The upload path turns it into a
   * retryable ANTIVIRUS_UNAVAILABLE instead of "file rejected".
   */
  antivirusUnavailable: boolean;
};

export type FileSecurityCheck = {
  name: string;
  passed: boolean;
  reason: string;
};
