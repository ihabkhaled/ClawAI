export function isLocalAiRuntimeEnabled(
  value: string | undefined = process.env['CLAW_LOCAL_AI'],
): boolean {
  return value?.trim().toLowerCase() === 'true';
}
