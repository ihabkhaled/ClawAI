/** Deep link to one memory on the Memory page (ADR-133). */
export function memoryDeepLink(memoryId: string): string {
  return `/memory?memoryId=${encodeURIComponent(memoryId)}`;
}

/** Deep link to one pack on the Context page (ADR-133). */
export function contextPackDeepLink(packId: string): string {
  return `/context?packId=${encodeURIComponent(packId)}`;
}
