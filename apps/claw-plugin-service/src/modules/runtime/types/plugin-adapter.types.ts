export type AdapterContext = {
  userId: string;
  // Install settings, already validated against the manifest settingsSchema.
  settings: Record<string, unknown>;
  signal: AbortSignal;
};

export type AdapterResult = {
  content: string;
  truncated: boolean;
};

// Every first-party tool runs through this contract. Adapters read no
// process.env, touch no other service's database, and reach the network only
// through the shared egress client limited to manifest.network.
export type PluginAdapter = {
  execute(
    context: AdapterContext,
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<AdapterResult>;
};
