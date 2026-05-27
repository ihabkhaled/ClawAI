// Phase 8 UI transparency — name of the NEXT_PUBLIC env that toggles
// the dev-mode Thread Context Inspector. Read at module level because
// Next.js inlines NEXT_PUBLIC_ values at build time; the resulting
// boolean is exported as a constant so components don't sprinkle
// `process.env` reads through TSX.
const RAW_FLAG = process.env['NEXT_PUBLIC_ROUTING_DEBUG_CONTEXT_INSPECTOR_ENABLED'];

export const THREAD_CONTEXT_INSPECTOR_ENABLED: boolean =
  typeof RAW_FLAG === 'string' && RAW_FLAG.toLowerCase() === 'true';
