export type AdapterContext = {
  userId: string;
  // Install settings, already validated against the manifest settingsSchema.
  settings: Record<string, unknown>;
  signal: AbortSignal;
  // manifest.network.hosts, lowercase: the only hosts the adapter may reach (besides public-web mode).
  allowedHosts: ReadonlySet<string>;
  timeoutMs: number;
  maxResultBytes: number;
};

export type AdapterResult = {
  content: string;
  truncated: boolean;
};

// Every first-party tool runs through this contract. Adapters read no
// process.env, touch no other service's database, and reach the network only
// through SafeEgressManager limited to manifest.network. They throw AdapterError
// with a message that is safe to show (never an address, header or network text).
export type PluginAdapter = {
  execute(
    context: AdapterContext,
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<AdapterResult>;
};
