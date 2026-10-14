/** Resolves a host name to every address DNS holds for it (A and AAAA). Tests supply a fake. */
export abstract class HostResolver {
  abstract resolveAll(host: string): Promise<string[]>;
}
