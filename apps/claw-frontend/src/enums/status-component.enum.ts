/**
 * The coarse components the service-status section reports. Mirrors
 * health-service's `StatusComponent`: the API names components, never the
 * services or hosts behind them.
 */
export enum StatusComponent {
  ACCOUNTS = 'accounts',
  CHAT = 'chat',
  FILES = 'files',
  IMAGES = 'images',
  RESEARCH = 'research',
  PAYMENTS = 'payments',
  WORKSPACES = 'workspaces',
  CODING_AGENT = 'coding-agent',
  LOCAL_MODELS = 'local-models',
  PLATFORM = 'platform',
}
