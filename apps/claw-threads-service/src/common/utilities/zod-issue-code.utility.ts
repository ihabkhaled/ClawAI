import type { core } from 'zod';

/** A refinement can carry a machine code in `params.code`; this reads it back, or `undefined`. */
export function zodIssueCode(issue: core.$ZodIssue): string | undefined {
  if (issue.code !== 'custom') return undefined;
  const code: unknown = issue.params?.['code'];
  return typeof code === 'string' ? code : undefined;
}
