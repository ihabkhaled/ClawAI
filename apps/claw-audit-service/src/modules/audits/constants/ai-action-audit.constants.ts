import { EventPattern } from '@claw/shared-types';

import type { AiActionAuditEventHandlerEntry } from '../types/ai-action-audit.types';

export const AI_ACTION_EVENT_HANDLERS: AiActionAuditEventHandlerEntry[] = [
  {
    pattern: EventPattern.AI_ACTION_SUGGESTION_CREATED,
    action: 'AI_ACTION_SUGGESTION_CREATED',
    defaultSeverity: 'LOW',
  },
  {
    pattern: EventPattern.AI_ACTION_PENDING_APPROVAL,
    action: 'AI_ACTION_PENDING_APPROVAL',
    defaultSeverity: 'LOW',
  },
  {
    pattern: EventPattern.AI_ACTION_AUTO_APPROVED,
    action: 'AI_ACTION_AUTO_APPROVED',
    defaultSeverity: 'MEDIUM',
  },
  {
    pattern: EventPattern.AI_ACTION_APPROVED,
    action: 'AI_ACTION_APPROVED',
    defaultSeverity: 'MEDIUM',
  },
  {
    pattern: EventPattern.AI_ACTION_REJECTED,
    action: 'AI_ACTION_REJECTED',
    defaultSeverity: 'LOW',
  },
  {
    pattern: EventPattern.AI_ACTION_EXECUTED,
    action: 'AI_ACTION_EXECUTED',
    defaultSeverity: 'MEDIUM',
  },
  {
    pattern: EventPattern.AI_ACTION_DENIED,
    action: 'AI_ACTION_DENIED',
    defaultSeverity: 'HIGH',
  },
  {
    pattern: EventPattern.AI_ACTION_EXPIRED,
    action: 'AI_ACTION_EXPIRED',
    defaultSeverity: 'LOW',
  },
  {
    pattern: EventPattern.AI_ACTION_EDITED,
    action: 'AI_ACTION_EDITED',
    defaultSeverity: 'LOW',
  },
];

// v3 round (2026-05-11) — admin policy CRUD audit trail. Separate from
// AI_ACTION_EVENT_HANDLERS because the event payload shape is different
// (policy CRUD vs queue lifecycle).
export const AI_ACTION_POLICY_EVENT_HANDLERS: AiActionAuditEventHandlerEntry[] = [
  {
    pattern: EventPattern.AI_ACTION_POLICY_CREATED,
    action: 'AI_ACTION_POLICY_CREATED',
    defaultSeverity: 'MEDIUM',
  },
  {
    pattern: EventPattern.AI_ACTION_POLICY_UPDATED,
    action: 'AI_ACTION_POLICY_UPDATED',
    defaultSeverity: 'MEDIUM',
  },
  {
    pattern: EventPattern.AI_ACTION_POLICY_DELETED,
    action: 'AI_ACTION_POLICY_DELETED',
    defaultSeverity: 'HIGH',
  },
];

const RISK_TO_SEVERITY = new Map<string, string>([
  ['LOW', 'LOW'],
  ['MEDIUM', 'MEDIUM'],
  ['HIGH', 'HIGH'],
  ['CRITICAL', 'HIGH'],
]);

export function resolveSeverity(riskLabel: string | null | undefined): string {
  if (riskLabel === null || riskLabel === undefined) return 'LOW';
  return RISK_TO_SEVERITY.get(riskLabel) ?? 'LOW';
}
