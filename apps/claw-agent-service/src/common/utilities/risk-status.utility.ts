import { TerminalCommandStatus } from '../enums/terminal-command-status.enum';
import type { RiskAssessment } from '../../modules/agent/types/policy.types';

export function resolveInitialStatus(assessment: RiskAssessment): TerminalCommandStatus {
  if (assessment.blockedByPolicy) return TerminalCommandStatus.REJECTED;
  if (assessment.autoApproved) return TerminalCommandStatus.APPROVED;
  return TerminalCommandStatus.PENDING_APPROVAL;
}
