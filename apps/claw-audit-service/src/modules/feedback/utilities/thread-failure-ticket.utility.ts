import type { ThreadGenerationFailedPayload } from '@claw/shared-types';

import { THREAD_FAILURE_EXTERNAL_KEY_PREFIX } from '../constants/system-ticket.constants';

/** A plain table cell: no pipes, no line breaks, bounded length. */
function cell(value: string | number | null): string {
  return String(value ?? 'n/a')
    .replaceAll(/[\r\n|]+/gu, ' ')
    .replaceAll(/\s+/gu, ' ')
    .slice(0, 300);
}

export function threadFailureExternalKey(jobId: string): string {
  return `${THREAD_FAILURE_EXTERNAL_KEY_PREFIX}${jobId}`;
}

export function threadFailureTitle(payload: ThreadGenerationFailedPayload): string {
  return `Threads generation failed at ${payload.failedStage} (job ${payload.jobId})`;
}

/**
 * Markdown for the admin who has to triage a failed Threads job. Built from the
 * event's safe fields only, so it cannot contain the conversation, a prompt, a
 * draft, a token or an auth header.
 */
export function renderThreadFailureTicket(payload: ThreadGenerationFailedPayload): string {
  const wait = payload.startedAt
    ? Math.max(0, Date.parse(payload.startedAt) - Date.parse(payload.queuedAt))
    : null;
  const duration = Math.max(0, Date.parse(payload.failedAt) - Date.parse(payload.queuedAt));
  const rows: Array<[string, string | number | null]> = [
    ['Job', payload.jobId],
    ['Owner', payload.ownerId],
    ['Correlation', payload.correlationId],
    ['Failed stage', payload.failedStage],
    ['Error code', payload.errorCode],
    ['Last error', payload.failureSummary],
    ['Attempts', payload.attemptCount],
    ['Source snapshot hash', payload.sourceSnapshotHash],
    ['Credit reservation', payload.budgetCloseStatus],
    ['Queued at', payload.queuedAt],
    ['Started at', payload.startedAt],
    ['Failed at', payload.failedAt],
    ['Queue wait (ms)', wait],
    ['Total duration (ms)', duration],
  ];
  const roles = payload.roles.map((role) => {
    const fallbacks =
      role.fallbacks.length > 0
        ? ` (fallbacks: ${role.fallbacks.map((f) => `${cell(f.provider)} / ${cell(f.model)}`).join(', ')})`
        : '';
    return `- **${cell(role.roleId)}**: ${cell(role.provider)} / ${cell(role.model)}${fallbacks}`;
  });
  return [
    'A Threads generation job ran out of retries and fallbacks. The owner has no public content from it; the credit reservation state is below.',
    '',
    '| Field | Value |',
    '| --- | --- |',
    ...rows.map(([field, value]) => `| ${field} | ${cell(value)} |`),
    '',
    '## Models',
    ...(roles.length > 0 ? roles : ['- none recorded']),
  ].join('\n');
}
