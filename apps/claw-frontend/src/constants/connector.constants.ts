import { ConnectorAuthType, ConnectorProvider } from '@/enums';

export const PROVIDER_DISPLAY_NAMES: Record<ConnectorProvider, string> = {
  [ConnectorProvider.OPENAI]: 'OpenAI',
  [ConnectorProvider.ANTHROPIC]: 'Anthropic',
  [ConnectorProvider.GEMINI]: 'Google Gemini',
  [ConnectorProvider.AWS_BEDROCK]: 'AWS Bedrock',
  [ConnectorProvider.DEEPSEEK]: 'DeepSeek',
  [ConnectorProvider.OLLAMA]: 'Ollama',
};

export const PROVIDER_ICON_COLORS: Record<ConnectorProvider, string> = {
  [ConnectorProvider.OPENAI]:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  [ConnectorProvider.ANTHROPIC]:
    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  [ConnectorProvider.GEMINI]: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  [ConnectorProvider.AWS_BEDROCK]:
    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  [ConnectorProvider.DEEPSEEK]:
    'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  [ConnectorProvider.OLLAMA]:
    'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
};

export const AUTH_TYPE_LABELS: Record<string, string> = {
  [ConnectorAuthType.API_KEY]: 'API Key',
  [ConnectorAuthType.OAUTH2]: 'OAuth 2.0',
  [ConnectorAuthType.NONE]: 'None',
};

export const CONNECTOR_PROVIDER_OPTIONS = Object.values(ConnectorProvider);

export const CONNECTOR_AUTH_TYPE_OPTIONS = Object.values(ConnectorAuthType);

export const CONNECTOR_STATUS_LABELS: Record<string, string> = {
  HEALTHY: 'Healthy',
  DEGRADED: 'Degraded',
  DOWN: 'Down',
  UNKNOWN: 'Unknown',
};

export const LIFECYCLE_LABELS: Record<string, string> = {
  ga: 'GA',
  preview: 'Preview',
  deprecated: 'Deprecated',
  beta: 'Beta',
};

export const PROVIDER_DEFAULT_BASE_URLS: Record<ConnectorProvider, string> = {
  [ConnectorProvider.OPENAI]: 'https://api.openai.com/v1',
  [ConnectorProvider.ANTHROPIC]: 'https://api.anthropic.com',
  [ConnectorProvider.GEMINI]: 'https://generativelanguage.googleapis.com/v1',
  [ConnectorProvider.AWS_BEDROCK]: 'https://bedrock-runtime.{region}.amazonaws.com',
  [ConnectorProvider.DEEPSEEK]: 'https://api.deepseek.com/v1',
  [ConnectorProvider.OLLAMA]: 'http://localhost:11434',
};
