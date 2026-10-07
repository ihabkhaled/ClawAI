// Operators need the failing step, never prompts, drafts or provider bodies.
export function describeFailure(error: unknown): string {
  if (!(error instanceof Error)) return 'non-error thrown';
  const cause =
    error.cause instanceof Error
      ? ` <- ${error.cause.name}: ${error.cause.message.slice(0, 200)}`
      : '';
  return `${error.name}: ${error.message.slice(0, 200)}${cause}`;
}
